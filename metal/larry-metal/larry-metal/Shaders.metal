//
//  Shaders.metal
//  larry-metal
//
//  Created by Jeremi Stadler on 2021-08-07.
//

// File for Metal kernel and shader functions

#include <metal_stdlib>
#include <simd/simd.h>

// Including header shared between this Metal shader code and Swift/C code executing Metal API commands
#import "ShaderTypes.h"

using namespace metal;

typedef struct
{
    float2 position;
  //  float4 color [[attribute(VertexAttributeColor)]];
} Vertex;

typedef struct
{
    float4 position [[position]];
    float4 color;
} ColorInOut;



vertex ColorInOut vertexShader(device const float2 *pos [[buffer(0)]],
                               device const float4 *color [[buffer(1)]],
                               uint vid [[vertex_id]])
{
    ColorInOut out;

    out.position = float4(pos[vid], 0, 1.0);
    out.color = color[vid];

    return out;
}

fragment float4 fragmentShader(ColorInOut in [[stage_in]],
                               constant Uniforms & uniforms [[ buffer(BufferIndexUniforms) ]]
                               )
{
    return in.color;
}
