class AslPcmCollectorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetChunkSize = 2048;
    this.chunk = new Float32Array(this.targetChunkSize);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs && inputs[0] && inputs[0][0] ? inputs[0][0] : null;
    if (!input || !input.length) {
      return true;
    }

    let i = 0;
    while (i < input.length) {
      const remaining = this.targetChunkSize - this.offset;
      const toCopy = Math.min(remaining, input.length - i);
      this.chunk.set(input.subarray(i, i + toCopy), this.offset);
      this.offset += toCopy;
      i += toCopy;

      if (this.offset >= this.targetChunkSize) {
        this.port.postMessage({ samples: this.chunk });
        this.chunk = new Float32Array(this.targetChunkSize);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("asl-pcm-collector-processor", AslPcmCollectorProcessor);
