import React, { useState, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { lightTheme, darkTheme } from "./theme";
import CssBaseline from "@mui/material/CssBaseline";
import Switch from "@mui/material/Switch";

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <MuiThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
      {children}
    </MuiThemeProvider>
  );
};

export default ThemeProvider;
