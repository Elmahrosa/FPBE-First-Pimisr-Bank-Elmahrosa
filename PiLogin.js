import React, { useEffect } from "react";

const PiLogin = ({ onLogin }) => {
  useEffect(() => {
    window.PiNetwork?.enable(["username", "payment"]).then(onLogin).catch(console.error);
  }, [onLogin]);

  return <div>Logging in via Pi Network...</div>;
};

export default PiLogin;
