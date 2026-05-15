use wasm_bindgen::prelude::*;

const GENE_FLOATS: usize = 10;

#[wasm_bindgen]
pub struct Rasterizer {
    width: u32,
    height: u32,
    src: Vec<u8>,
    buffer: Vec<u8>,
    row_min: Vec<i32>,
    row_max: Vec<i32>,
}

#[wasm_bindgen]
impl Rasterizer {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, src: &[u8]) -> Rasterizer {
        let pixels = (width as usize) * (height as usize);
        Rasterizer {
            width,
            height,
            src: src.to_vec(),
            buffer: vec![255u8; pixels * 4],
            row_min: vec![0i32; height as usize + 4],
            row_max: vec![0i32; height as usize + 4],
        }
    }

    pub fn get_fitness(&mut self, genes: &[f32]) -> f64 {
        let w = self.width;
        let h = self.height;
        let pixels = (w as usize) * (h as usize);

        // Reset working buffer to white.
        for b in &mut self.buffer[..pixels * 4] {
            *b = 255;
        }

        let count = genes.len() / GENE_FLOATS;
        for i in 0..count {
            let off = i * GENE_FLOATS;

            let r = (genes[off + 6] * 255.0) as i32;
            let g = (genes[off + 7] * 255.0) as i32;
            let b = (genes[off + 8] * 255.0) as i32;
            let mut alpha_i = (genes[off + 9] * 256.0) as i32;
            if alpha_i < 0 {
                alpha_i = 0;
            } else if alpha_i > 256 {
                alpha_i = 256;
            }
            if alpha_i == 0 {
                continue;
            }

            let wf = w as f64;
            let hf = h as f64;
            draw_triangle(
                &mut self.buffer,
                &mut self.row_min,
                &mut self.row_max,
                w,
                h,
                genes[off + 0] as f64 * wf,
                genes[off + 1] as f64 * hf,
                genes[off + 2] as f64 * wf,
                genes[off + 3] as f64 * hf,
                genes[off + 4] as f64 * wf,
                genes[off + 5] as f64 * hf,
                r,
                g,
                b,
                alpha_i,
            );
        }

        calculate_fitness(&self.src, &self.buffer, w, h)
    }
}

#[inline(always)]
fn walk_edge(
    row_min: &mut [i32],
    row_max: &mut [i32],
    mut ax: f64,
    mut ay: f64,
    mut bx: f64,
    mut by: f64,
    row_start: i32,
    row_end: i32,
    y_base: i32,
) {
    if ay == by {
        return;
    }
    if ay > by {
        std::mem::swap(&mut ax, &mut bx);
        std::mem::swap(&mut ay, &mut by);
    }

    let y_lo = ay.ceil() as i32;
    let y_hi = by.floor() as i32;
    let y_from = if y_lo < row_start { row_start } else { y_lo };
    let y_to = if y_hi > row_end { row_end } else { y_hi };
    if y_from > y_to {
        return;
    }

    let slope = (bx - ax) / (by - ay);
    let mut x = ax + slope * (y_from as f64 - ay);
    let mut r = (y_from - y_base) as usize;

    for _ in y_from..=y_to {
        let xi = x as i32;
        unsafe {
            let rmin = row_min.get_unchecked_mut(r);
            if xi < *rmin {
                *rmin = xi;
            }
            let rmax = row_max.get_unchecked_mut(r);
            if xi > *rmax {
                *rmax = xi;
            }
        }
        x += slope;
        r += 1;
    }
}

#[inline(always)]
fn draw_triangle(
    buffer: &mut [u8],
    row_min: &mut [i32],
    row_max: &mut [i32],
    width: u32,
    height: u32,
    x0: f64,
    y0: f64,
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
    r: i32,
    g: i32,
    b: i32,
    alpha_i: i32,
) {
    let mut min_y = y0.min(y1).min(y2);
    let mut max_y = y0.max(y1).max(y2);
    if min_y < 0.0 {
        min_y = 0.0;
    }
    if max_y > (height - 1) as f64 {
        max_y = (height - 1) as f64;
    }

    let y_start = min_y.ceil() as i32;
    let y_end = max_y.floor() as i32;
    if y_start > y_end {
        return;
    }

    let row_count = (y_end - y_start + 1) as usize;
    if row_count > row_min.len() {
        return;
    }

    for i in 0..row_count {
        unsafe {
            *row_min.get_unchecked_mut(i) = i32::MAX;
            *row_max.get_unchecked_mut(i) = i32::MIN;
        }
    }

    walk_edge(row_min, row_max, x0, y0, x1, y1, y_start, y_end, y_start);
    walk_edge(row_min, row_max, x1, y1, x2, y2, y_start, y_end, y_start);
    walk_edge(row_min, row_max, x2, y2, x0, y0, y_start, y_end, y_start);

    let inv_alpha = 256 - alpha_i;
    let r_pre = r * alpha_i;
    let g_pre = g * alpha_i;
    let b_pre = b * alpha_i;
    let w = width as i32;

    for row in 0..row_count {
        let mut x_l = unsafe { *row_min.get_unchecked(row) };
        let mut x_r = unsafe { *row_max.get_unchecked(row) };
        if x_l > x_r {
            continue;
        }
        if x_l < 0 {
            x_l = 0;
        }
        if x_r > w - 1 {
            x_r = w - 1;
        }
        if x_l > x_r {
            continue;
        }

        let y = y_start + row as i32;
        let mut idx = ((y * w + x_l) as usize) * 4;
        for _ in x_l..=x_r {
            unsafe {
                let pr = buffer.get_unchecked_mut(idx);
                *pr = ((r_pre + (*pr as i32) * inv_alpha) >> 8) as u8;
                let pg = buffer.get_unchecked_mut(idx + 1);
                *pg = ((g_pre + (*pg as i32) * inv_alpha) >> 8) as u8;
                let pb = buffer.get_unchecked_mut(idx + 2);
                *pb = ((b_pre + (*pb as i32) * inv_alpha) >> 8) as u8;
            }
            idx += 4;
        }
    }
}

#[inline(always)]
fn calculate_fitness(src: &[u8], buf: &[u8], w: u32, h: u32) -> f64 {
    let len = (w as usize) * (h as usize) * 4;
    let mut diff: u64 = 0;
    let mut i = 0;
    while i < len {
        unsafe {
            let dr = *src.get_unchecked(i) as i32 - *buf.get_unchecked(i) as i32;
            let dg = *src.get_unchecked(i + 1) as i32 - *buf.get_unchecked(i + 1) as i32;
            let db = *src.get_unchecked(i + 2) as i32 - *buf.get_unchecked(i + 2) as i32;
            diff += (dr * dr + dg * dg + db * db) as u64;
        }
        i += 4;
    }
    (diff as f64) / ((w as f64) * (h as f64))
}
