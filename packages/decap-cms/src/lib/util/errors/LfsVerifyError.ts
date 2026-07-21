export const LFS_VERIFY_ERROR = 'LFS_VERIFY_ERROR';

export class LfsVerifyError extends Error {
  message: string;
  status: number;

  constructor(status: number) {
    const message = `Unexpected response status '${status}' while verifying LFS resource`;
    super(message);
    this.message = message;
    this.status = status;
    this.name = LFS_VERIFY_ERROR;
  }
}
