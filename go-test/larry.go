package main

import (
	"image"
	"image/draw"
	"image/png"
	"log"
	"os"

	"golang.org/x/image/vector"
)

type Triangle struct {
	Pos   []float32
	Color []float32
}

func main() {
	triangles := make([]Triangle, 0)

	triangles = append(triangles, Triangle{
		Pos:   []float32{0, 0, 1, 0, 1, 1},
		Color: []float32{0, 0, 1, 1},
	})

	const SIZE = 64

	r := vector.NewRasterizer(SIZE, SIZE)
	r.DrawOp = draw.Src
	dst := image.NewAlpha(image.Rect(0, 0, SIZE, SIZE))

	for _, t := range triangles {
		colorImg := image.NewRGBA(dst.Bounds())
		//colorImg.Set()

		r.MoveTo(t.Pos[0]*SIZE, t.Pos[1]*SIZE)
		r.LineTo(t.Pos[2]*SIZE, t.Pos[3]*SIZE)
		r.LineTo(t.Pos[4]*SIZE, t.Pos[5]*SIZE)
		r.ClosePath()
		r.Draw(dst, dst.Bounds(), colorImg, image.Point{})

	}

	f, err := os.Create("outimage.png")
	if err != nil {
		log.Fatalln("create image file", err)
	}
	defer f.Close()

	err = png.Encode(f, dst)
	if err != nil {
		log.Fatalln("save image", err)
	}

	// Visualize the pixels.
	const asciiArt = ".++8"
	buf := make([]byte, 0, SIZE*(SIZE+1))
	for y := 0; y < SIZE; y++ {
		for x := 0; x < SIZE; x++ {
			a := dst.AlphaAt(x, y).A
			buf = append(buf, asciiArt[a>>6])
		}
		buf = append(buf, '\n')
	}
	os.Stdout.Write(buf)
}
