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
    float3 position;
  //  float4 color [[attribute(VertexAttributeColor)]];
} Vertex;

typedef struct
{
    float4 position [[position]];
   // float4 color;
} ColorInOut;



vertex ColorInOut vertexShader(device const Vertex *in [[buffer(0)]],
                               uint vid [[vertex_id]])
{
    ColorInOut out;

    float4 position = float4(in[vid].position, 1.0);
    out.position = position;
   // out.color = in.color;

    return out;
}

fragment float4 fragmentShader(ColorInOut in [[stage_in]],
                               constant Uniforms & uniforms [[ buffer(BufferIndexUniforms) ]]
                               )
{
   // float4 colorSample = in.color;
   // return float4(colorSample);
    return float4(1,0.5,1,1);
}
