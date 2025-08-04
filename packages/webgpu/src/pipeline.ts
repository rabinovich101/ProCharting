export interface PipelineDescriptor {
  vertex: string;
  fragment: string;
  format: GPUTextureFormat;
  topology?: GPUPrimitiveTopology;
  cullMode?: GPUCullMode;
  multisample?: {
    count: number;
  };
}

export async function createPipeline(
  device: GPUDevice,
  descriptor: PipelineDescriptor,
): Promise<GPURenderPipeline> {
  const shaderModule = device.createShaderModule({
    code: `
      ${descriptor.vertex}
      
      ${descriptor.fragment}
    `,
  });

  const pipeline = await device.createRenderPipelineAsync({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs_main',
      buffers: [{
        arrayStride: 32, // 8 floats: x, y, open, high, low, close, volume, color
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
          { shaderLocation: 1, offset: 8, format: 'float32x4' }, // OHLC
          { shaderLocation: 2, offset: 24, format: 'float32' }, // volume
          { shaderLocation: 3, offset: 28, format: 'float32' }, // color
        ],
      }],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [{
        format: descriptor.format,
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
          },
        },
      }],
    },
    primitive: {
      topology: descriptor.topology ?? 'triangle-list',
      cullMode: descriptor.cullMode ?? 'none',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
    multisample: descriptor.multisample ?? { count: 1 },
  });

  return pipeline;
}