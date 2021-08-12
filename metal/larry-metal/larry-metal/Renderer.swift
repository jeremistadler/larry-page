
import Metal
import MetalKit
import simd

// The 256 byte aligned size of our uniform structure
let alignedUniformsSize = (MemoryLayout<Uniforms>.size + 0xFF) & -0x100

let maxBuffersInFlight = 3

enum RendererError: Error {
    case badVertexDescriptor
}

class Renderer: NSObject, MTKViewDelegate {

    public let device: MTLDevice
    let commandQueue: MTLCommandQueue
    var dynamicUniformBuffer: MTLBuffer
    var pipelineState: MTLRenderPipelineState

    let inFlightSemaphore = DispatchSemaphore(value: maxBuffersInFlight)

    var uniformBufferOffset = 0

    var uniformBufferIndex = 0

    var uniforms: UnsafeMutablePointer<Uniforms>

    var projectionMatrix: matrix_float4x4 = matrix_float4x4()

    var posVertexBuffer: MTLBuffer!
    var colorVertexBuffer: MTLBuffer!

    init?(metalKitView: MTKView) {
        self.device = metalKitView.device!
        self.commandQueue = self.device.makeCommandQueue()!

        let uniformBufferSize = alignedUniformsSize * maxBuffersInFlight
        
        let vertexData: [Float] = [
            0.1,  0.9, // centered Top
            -0.9, -0.9, // Left bottom
            0.9, -0.9, // Right bottom
            
            -0.9, 0.9, // left Top
            0.1, -0.9, // center bottom
            0.9, 0.9, // right top
            
        ]
        
        let colorData: [Float] = [
//            255.0 / 255, 72.0 / 255, 176.0 / 255, 0.99, // Fluorescent Pink
//            255.0 / 255, 72.0 / 255, 176.0 / 255, 0.99, // Fluorescent Pink
//            255.0 / 255, 72.0 / 255, 176.0 / 255, 0.99, // Fluorescent Pink
   
//            0.0 / 255, 120.0 / 255, 191.0 / 255, 0.5, // Blue
//            0.0 / 255, 120.0 / 255, 191.0 / 255, 0.9, // Blue
//            0.0 / 255, 120.0 / 255, 191.0 / 255, 0.5, // Blue
            
            255.0 / 255, 102.0 / 255, 94.0 / 255, 0.5, // Red
            255.0 / 255, 102.0 / 255, 94.0 / 255, 0.9, // Red
            255.0 / 255, 102.0 / 255, 94.0 / 255, 0.5, // Red

            0.0 / 255, 169.0 / 255, 92.0 / 255, 0.5, // Green
            0.0 / 255, 169.0 / 255, 92.0 / 255, 0.9, // Green
            0.0 / 255, 169.0 / 255, 92.0 / 255, 0.5, // Green
        ]
        let posBufferSize = vertexData.count * MemoryLayout.size(ofValue: vertexData[0])
        posVertexBuffer = device.makeBuffer(bytes: vertexData, length: posBufferSize, options: [])

        let colorBufferSize = colorData.count * MemoryLayout.size(ofValue: colorData[0])
        colorVertexBuffer = device.makeBuffer(bytes: colorData, length: colorBufferSize, options: [])



        self.dynamicUniformBuffer = self.device.makeBuffer(length:uniformBufferSize,
                                                           options:[MTLResourceOptions.storageModeShared])!

        self.dynamicUniformBuffer.label = "UniformBuffer"

        uniforms = UnsafeMutableRawPointer(dynamicUniformBuffer.contents()).bindMemory(to:Uniforms.self, capacity:1)

        metalKitView.colorPixelFormat = MTLPixelFormat.bgra8Unorm
        metalKitView.sampleCount = 1


        do {
            pipelineState = try Renderer.buildRenderPipelineWithDevice(device: device,
                                                                       metalKitView: metalKitView)
        } catch {
            print("Unable to compile render pipeline state.  Error info: \(error)")
            return nil
        }

        super.init()

    }


    class func buildRenderPipelineWithDevice(device: MTLDevice,
                                             metalKitView: MTKView) throws -> MTLRenderPipelineState {
        /// Build a render state pipeline object

        let library = device.makeDefaultLibrary()

        let vertexFunction = library?.makeFunction(name: "vertexShader")
        let fragmentFunction = library?.makeFunction(name: "fragmentShader")
        
        // 2
        let pipelineStateDescriptor = MTLRenderPipelineDescriptor()
        pipelineStateDescriptor.vertexFunction = vertexFunction
        pipelineStateDescriptor.fragmentFunction = fragmentFunction
        pipelineStateDescriptor.colorAttachments[0].pixelFormat = .bgra8Unorm
        
//        pipelineStateDescriptor.colorAttachments[0].isBlendingEnabled = true
//
//        pipelineStateDescriptor.colorAttachments[0].rgbBlendOperation = .add
//        pipelineStateDescriptor.colorAttachments[0].alphaBlendOperation = .add
//
//        pipelineStateDescriptor.colorAttachments[0].sourceRGBBlendFactor = .oneMinusSourceAlpha
//        pipelineStateDescriptor.colorAttachments[0].sourceAlphaBlendFactor = .oneMinusSourceAlpha
//
        // 3
        return try! device.makeRenderPipelineState(descriptor: pipelineStateDescriptor)
    }

    private func updateDynamicBufferState() {
        /// Update the state of our uniform buffers before rendering

        uniformBufferIndex = (uniformBufferIndex + 1) % maxBuffersInFlight

        uniformBufferOffset = alignedUniformsSize * uniformBufferIndex

        uniforms = UnsafeMutableRawPointer(dynamicUniformBuffer.contents() + uniformBufferOffset).bindMemory(to:Uniforms.self, capacity:1)
    }


    func draw(in view: MTKView) {
        _ = inFlightSemaphore.wait(timeout: DispatchTime.distantFuture)
        
        if let commandBuffer = commandQueue.makeCommandBuffer() {
            let semaphore = inFlightSemaphore
            commandBuffer.addCompletedHandler { (_ commandBuffer)-> Swift.Void in
                semaphore.signal()
            }
            
            self.updateDynamicBufferState()
            
//            self.updateGameState()
            
            /// Delay getting the currentRenderPassDescriptor until we absolutely need it to avoid
            ///   holding onto the drawable and blocking the display pipeline any longer than necessary
            let renderPassDescriptor = view.currentRenderPassDescriptor
            
            if let renderPassDescriptor = renderPassDescriptor {
                
                renderPassDescriptor.colorAttachments[0].loadAction = .clear
                renderPassDescriptor.colorAttachments[0].clearColor = MTLClearColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0)
                
                /// Final pass rendering code here
                if let renderEncoder = commandBuffer.makeRenderCommandEncoder(descriptor: renderPassDescriptor) {
                    renderEncoder.label = "Primary Render Encoder"
                    
                    renderEncoder.pushDebugGroup("Draw Box")
                    
                    renderEncoder.setCullMode(.none)
                    
                    renderEncoder.setRenderPipelineState(pipelineState)
                    
                    // renderEncoder.setDepthStencilState(depthState)
                    
                    renderEncoder.setVertexBuffer(dynamicUniformBuffer, offset:uniformBufferOffset, index: BufferIndex.uniforms.rawValue)
                    
                    renderEncoder.setFragmentBuffer(dynamicUniformBuffer, offset:uniformBufferOffset, index: BufferIndex.uniforms.rawValue)
                    
                    renderEncoder.setVertexBuffer(posVertexBuffer, offset: 0, index: 0)
                    renderEncoder.setVertexBuffer(colorVertexBuffer, offset: 0, index: 1)
                    
                    renderEncoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: posVertexBuffer.length, instanceCount: 1)

                    renderEncoder.popDebugGroup()
                    
                    renderEncoder.endEncoding()
                    
                    if let drawable = view.currentDrawable {
                        commandBuffer.present(drawable)
                    }
                }
            }
            
            commandBuffer.commit()
        }
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {

    }
}
