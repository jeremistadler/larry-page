use wasm_bindgen::prelude::*;
#[cfg(target_arch = "wasm32")]
use core::arch::wasm32::*;

const GENE_FLOATS: usize = 10;
const MAX_GENES: usize = 256;

#[wasm_bindgen]
pub fn wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}

#[wasm_bindgen]
pub struct Rasterizer {
    width: u32,
    height: u32,
    src: Vec<u8>,
    buffer: Vec<u8>,
    row_min: Vec<i32>,
    row_max: Vec<i32>,
    genes_buf: Box<[f32; MAX_GENES * GENE_FLOATS]>,
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
            genes_buf: Box::new([0.0f32; MAX_GENES * GENE_FLOATS]),
        }
    }

    /// Pointer to the internal genes buffer (host writes via a Float32Array
    /// view to skip wasm-bindgen marshaling on every call).
    pub fn genes_ptr(&self) -> *const f32 {
        self.genes_buf.as_ptr()
    }

    pub fn genes_capacity(&self) -> usize {
        MAX_GENES * GENE_FLOATS
    }

    /// Compute fitness over the first `gene_count` genes already written
    /// to the internal buffer via `genes_ptr`.
    pub fn get_fitness_internal(&mut self, gene_count: usize) -> f64 {
        let count = gene_count.min(MAX_GENES);
        let len = count * GENE_FLOATS;
        // SAFETY: split the borrow so we can pass the genes slice immutably
        // while mutably borrowing the rasterizer's buffers.
        let genes_ptr = self.genes_buf.as_ptr();
        let genes: &[f32] = unsafe { core::slice::from_raw_parts(genes_ptr, len) };
        Self::run(
            self.width,
            self.height,
            &self.src,
            &mut self.buffer,
            &mut self.row_min,
            &mut self.row_max,
            genes,
        )
    }

    pub fn get_fitness(&mut self, genes: &[f32]) -> f64 {
        Self::run(
            self.width,
            self.height,
            &self.src,
            &mut self.buffer,
            &mut self.row_min,
            &mut self.row_max,
            genes,
        )
    }

    fn run(
        w: u32,
        h: u32,
        src: &[u8],
        buffer: &mut [u8],
        row_min: &mut [i32],
        row_max: &mut [i32],
        genes: &[f32],
    ) -> f64 {
        let pixels = (w as usize) * (h as usize);

        // Reset working buffer to white.
        for b in &mut buffer[..pixels * 4] {
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
                buffer,
                row_min,
                row_max,
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

        calculate_fitness(src, buffer, w, h)
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
    let a_pre = 255 * alpha_i;
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
        let mut x = x_l;

        blend_span_simd(
            buffer,
            &mut x,
            x_r,
            &mut idx,
            r_pre,
            g_pre,
            b_pre,
            a_pre,
            inv_alpha,
        );

        // Scalar tail (and full path on non-wasm).
        while x <= x_r {
            unsafe {
                let pr = buffer.get_unchecked_mut(idx);
                *pr = ((r_pre + (*pr as i32) * inv_alpha) >> 8) as u8;
                let pg = buffer.get_unchecked_mut(idx + 1);
                *pg = ((g_pre + (*pg as i32) * inv_alpha) >> 8) as u8;
                let pb = buffer.get_unchecked_mut(idx + 2);
                *pb = ((b_pre + (*pb as i32) * inv_alpha) >> 8) as u8;
            }
            idx += 4;
            x += 1;
        }
    }
}

#[cfg(target_arch = "wasm32")]
#[inline(always)]
fn blend_span_simd(
    buffer: &mut [u8],
    x: &mut i32,
    x_r: i32,
    idx: &mut usize,
    r_pre: i32,
    g_pre: i32,
    b_pre: i32,
    a_pre: i32,
    inv_alpha: i32,
) {
    unsafe {
        let inv = i16x8_splat(inv_alpha as i16);
        // Per-pixel addend: 4 i32 lanes for one RGBA pixel.
        let pre = i32x4(r_pre, g_pre, b_pre, a_pre);
        while *x + 4 <= x_r + 1 {
            let buf_v = v128_load(buffer.as_ptr().add(*idx) as *const v128);
            let buf_lo = i16x8_extend_low_u8x16(buf_v);
            let buf_hi = i16x8_extend_high_u8x16(buf_v);
            // Widening multiply each i16 lane by inv_alpha → i32x4 per pair of pixels.
            let p0 = i32x4_extmul_low_i16x8(buf_lo, inv);
            let p1 = i32x4_extmul_high_i16x8(buf_lo, inv);
            let p2 = i32x4_extmul_low_i16x8(buf_hi, inv);
            let p3 = i32x4_extmul_high_i16x8(buf_hi, inv);
            // Add per-pixel constant and shift right by 8.
            let r0 = i32x4_shr(i32x4_add(p0, pre), 8);
            let r1 = i32x4_shr(i32x4_add(p1, pre), 8);
            let r2 = i32x4_shr(i32x4_add(p2, pre), 8);
            let r3 = i32x4_shr(i32x4_add(p3, pre), 8);
            // Narrow back to u8x16 with saturation.
            let n01 = i16x8_narrow_i32x4(r0, r1);
            let n23 = i16x8_narrow_i32x4(r2, r3);
            let packed = u8x16_narrow_i16x8(n01, n23);
            v128_store(buffer.as_mut_ptr().add(*idx) as *mut v128, packed);
            *x += 4;
            *idx += 16;
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[inline(always)]
fn blend_span_simd(
    _buffer: &mut [u8],
    _x: &mut i32,
    _x_r: i32,
    _idx: &mut usize,
    _r_pre: i32,
    _g_pre: i32,
    _b_pre: i32,
    _a_pre: i32,
    _inv_alpha: i32,
) {
}

#[cfg(target_arch = "wasm32")]
#[inline(always)]
fn calculate_fitness(src: &[u8], buf: &[u8], w: u32, h: u32) -> f64 {
    let len = (w as usize) * (h as usize) * 4;
    let mut sum: v128 = i32x4_splat(0);
    let mut i = 0;
    unsafe {
        while i + 16 <= len {
            let s = v128_load(src.as_ptr().add(i) as *const v128);
            let b = v128_load(buf.as_ptr().add(i) as *const v128);
            // Widen to i16 so that (src - buf) fits without overflow.
            let s_lo = i16x8_extend_low_u8x16(s);
            let s_hi = i16x8_extend_high_u8x16(s);
            let b_lo = i16x8_extend_low_u8x16(b);
            let b_hi = i16x8_extend_high_u8x16(b);
            let d_lo = i16x8_sub(s_lo, b_lo);
            let d_hi = i16x8_sub(s_hi, b_hi);
            // Square: d * d in i32 to avoid overflow (max 255^2 = 65025).
            let sq_lo_lo = i32x4_extmul_low_i16x8(d_lo, d_lo);
            let sq_lo_hi = i32x4_extmul_high_i16x8(d_lo, d_lo);
            let sq_hi_lo = i32x4_extmul_low_i16x8(d_hi, d_hi);
            let sq_hi_hi = i32x4_extmul_high_i16x8(d_hi, d_hi);
            sum = i32x4_add(sum, i32x4_add(sq_lo_lo, sq_lo_hi));
            sum = i32x4_add(sum, i32x4_add(sq_hi_lo, sq_hi_hi));
            i += 16;
        }
    }
    // Horizontal-add the four i32 lanes. Alpha lanes contribute 0 because
    // both src and buf hold 255 in alpha throughout.
    let mut diff: u64 = (i32x4_extract_lane::<0>(sum) as u64)
        + (i32x4_extract_lane::<1>(sum) as u64)
        + (i32x4_extract_lane::<2>(sum) as u64)
        + (i32x4_extract_lane::<3>(sum) as u64);
    // Tail (very rare for a 4-byte-pixel layout aligned at 16, but keep correct).
    while i + 4 <= len {
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

#[cfg(not(target_arch = "wasm32"))]
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
