export interface NatsDefaultExecution {
  code: number;
  msg?: string;
}

export interface NatsExecutionError extends NatsDefaultExecution {
  err?: any;
}

export interface NatsExecutionKV extends NatsExecutionError {
  value?: any;
  seq?: any;
}

export interface NatsExecutionModel extends NatsExecutionError {}
