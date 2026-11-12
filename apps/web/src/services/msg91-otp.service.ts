declare global {
  interface Window {
    configuration?: any;
    sendOtp?: (
      identifier: string,
      success?: (data: any) => void,
      failure?: (error: any) => void,
    ) => void;
    retryOtp?: (
      channel: string | null,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      reqId?: string,
    ) => void;
    verifyOtp?: (
      otp: string | number,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      reqId?: string,
    ) => void;
    __onMsg91OtpSuccess?: (data: any) => void;
    __onMsg91OtpFailure?: (error: any) => void;
  }
}

class Msg91OtpService {
  private lastVerifiedToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.__onMsg91OtpSuccess = (data: any) => {
        const token =
          typeof data === 'string'
            ? data
            : data?.message || data?.token || (typeof data === 'object' ? JSON.stringify(data) : null);
        if (token) {
          this.lastVerifiedToken = token;
        }
      };
    }
  }

  async sendOtp(phone10Digit: string): Promise<any> {
    const clean = phone10Digit.replace(/\D/g, '').slice(-10);
    const mobile = `91${clean}`;
    this.lastVerifiedToken = null;

    return new Promise((resolve) => {
      const invoke = () => {
        if (typeof window !== 'undefined' && typeof window.sendOtp === 'function') {
          window.sendOtp(
            mobile,
            (data: any) => {
              console.log('[MSG91] OTP sent successfully:', data);
              resolve({ success: true, data });
            },
            (err: any) => {
              console.warn('[MSG91] sendOtp error:', err);
              resolve({ success: false, error: err });
            },
          );
          return true;
        }
        return false;
      };

      if (!invoke()) {
        setTimeout(() => {
          if (!invoke()) {
            resolve({ success: false, fallback: true });
          }
        }, 800);
      }
    });
  }

  async verifyOtp(otp: string): Promise<string | null> {
    return new Promise((resolve) => {
      const invoke = () => {
        if (typeof window !== 'undefined' && typeof window.verifyOtp === 'function') {
          window.verifyOtp(
            otp,
            (data: any) => {
              console.log('[MSG91] OTP verified on widget:', data);
              const token =
                typeof data === 'string'
                  ? data
                  : data?.message || data?.token || this.lastVerifiedToken || JSON.stringify(data);
              this.lastVerifiedToken = token;
              resolve(token);
            },
            (err: any) => {
              console.warn('[MSG91] verifyOtp error on widget:', err);
              resolve(this.lastVerifiedToken);
            },
          );
          return true;
        }
        return false;
      };

      if (!invoke()) {
        setTimeout(() => {
          if (!invoke()) {
            resolve(this.lastVerifiedToken);
          }
        }, 500);
      }
    });
  }

  async retryOtp(channel?: string | null): Promise<any> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && typeof window.retryOtp === 'function') {
        window.retryOtp(
          channel ?? null,
          (data: any) => {
            console.log('[MSG91] OTP retry success:', data);
            resolve({ success: true, data });
          },
          (err: any) => {
            console.warn('[MSG91] retryOtp error:', err);
            resolve({ success: false, error: err });
          },
        );
      } else {
        resolve({ fallback: true });
      }
    });
  }
}

export const msg91OtpService = new Msg91OtpService();

