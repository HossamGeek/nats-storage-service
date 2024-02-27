import { Test } from '@nestjs/testing';
import { NatsSerialization } from './natsSerialization';

describe('NatsSerialization', () => {
  let convertor: NatsSerialization; // Replace 'any' with the appropriate type

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [NatsSerialization],
    }).compile();

    convertor = moduleRef.get<NatsSerialization>(NatsSerialization); // Replace 'any' here too
  });

  it('should be defined', () => {
    expect(convertor).toBeDefined();
  });

  it('should convert from object to Uint8Array', () => {
    const data = { foo: 'bar' };
    const result = convertor.serialization(data);

    // Add your assertions here to check if the conversion is correct
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('should convert from Uint8Array to object', () => {
    const data = Uint8Array.from([
      123, 34, 102, 111, 111, 34, 58, 34, 98, 97, 114, 34, 125,
    ]);
    const result = convertor.deserialization(data);

    // Add your assertions here to check if the conversion is correct
    expect(result).toEqual({ foo: 'bar' });
  });

  // Add more test cases here
});
