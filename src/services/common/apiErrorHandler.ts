
export const handleApiError = (err: any) => {
  console.log("from handle api error")
    // the response object contain a field named errors if there is any errors
    try {
      let message = "";
      if (typeof err === "string") message = err;
      else if (Array.isArray(err)) {
        // and that error field may be an array... its an array in the login case.
        message = setErrorMessage(err, message);
      } else if (err.response) {
        if (err.response.data.errors && err.response.data.errors.length) {
          message = setErrorMessage(err.response.data.errors, message);
        } else {
          message = err.response.data.message;
        }
      } else {
        message = err.message;
      }
      if (message) {
        // showToastMessage('error',message)
        // return message;
      } else {
        // toast.error('something went wrong')
      }
    } catch (e) {
    //   toast.error('something went wrong')
    }
  };
  
  export const setErrorMessage = (error: any, message: string) => {
    error.forEach((item: any) => {
      message = message.length ? message + ", " + item.message : item.message;
    });
    return message;
  };
