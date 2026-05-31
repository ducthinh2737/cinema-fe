import axios from 'axios';

export interface AppError {
  message: string;
  statusCode?: number;
  details?: any;
}

export const parseError = (error: any): AppError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    
    let message = 'An unexpected server error occurred';
    if (data?.Message) {
      message = data.Message;
    } else if (data?.title) {
      message = data.title;
    } else if (error.message) {
      message = error.message;
    }

    return {
      message,
      statusCode: status,
      details: data,
    };
  }

  return {
    message: error?.message || 'An unexpected error occurred',
  };
};
