import {
  statusRequest,
  statusSuccess,
  statusFailure,
  STATUS_REQUEST,
  STATUS_SUCCESS,
  STATUS_FAILURE,
} from '../status';

describe('status action creators', () => {
  it('statusRequest() returns STATUS_REQUEST action', () => {
    expect(statusRequest()).toEqual({ type: STATUS_REQUEST });
  });

  it('statusSuccess(status) returns STATUS_SUCCESS action with payload', () => {
    const status = {
      auth: { status: true },
      api: { status: true, statusPage: 'https://status.example.com' },
    };
    expect(statusSuccess(status)).toEqual({
      type: STATUS_SUCCESS,
      payload: { status },
    });
  });

  it('statusSuccess() embeds the status object under payload.status', () => {
    const status = {
      auth: { status: false },
      api: { status: false, statusPage: 'https://status.example.com/down' },
    };
    const action = statusSuccess(status);
    expect(action.type).toBe(STATUS_SUCCESS);
    expect(action.payload.status).toBe(status);
  });

  it('statusFailure(error) returns STATUS_FAILURE action with error in payload', () => {
    const error = new Error('backend unreachable');
    const action = statusFailure(error);
    expect(action.type).toBe(STATUS_FAILURE);
    expect(action.payload.error).toBe(error);
  });
});
