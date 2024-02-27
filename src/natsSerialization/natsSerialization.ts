import { Injectable } from '@nestjs/common';
import { StringCodec } from 'nats';

@Injectable()
export class NatsSerialization {
  /**
   * Serializes the given data into a Uint8Array.
   *
   * @param {any} data - the data to be serialized
   * @return {Uint8Array} the serialized Uint8Array
   */
  serialization(data: any): Uint8Array {
    return StringCodec().encode(JSON.stringify(data));
  }
  /**
   * Deserialize the given Uint8Array data to an object.
   *
   * @param {Uint8Array} data - The data to be deserialized
   * @return {object} The deserialized object
   */
  deserialization(data: Uint8Array): object {
    return JSON.parse(StringCodec().decode(data));
  }
}
