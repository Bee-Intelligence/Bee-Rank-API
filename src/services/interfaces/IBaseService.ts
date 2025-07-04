// src/services/interfaces/IBaseService.ts
export interface IBaseService {
  init(): Promise<void>;
  validate(): Promise<boolean>;
  handleError(error: Error): void;
}
