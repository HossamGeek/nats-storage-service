import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import NatsBaseModel from './Nats/NatsBaseModel';
import { NatsSerialization } from './index';

@Module({
  providers: [NatsBaseModel, NatsSerialization],
  exports: [NatsSerialization, NatsBaseModel],
})
export class NatsStorageModule {
  /**
   * Returns a dynamic module for the specified NatsNodeConnection.
   *
   * @param {string} NatsNodeConnection - the NatsNodeConnection to be used
   * @return {DynamicModule} the created dynamic module
   */
  static forRoot(NatsNodeConnection: string): DynamicModule {
    return {
      module: NatsStorageModule,
      imports: [
        ClientsModule.register([
          {
            name: 'NATS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: [NatsNodeConnection],
            },
          },
        ]),
      ],
    };
  }
}
