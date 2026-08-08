import { createTheme } from "@mui/material/styles";

export const eventlerTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#ff5876",
      dark: "#d9365a",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#6d72e8",
      dark: "#4f55cf",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f6f3ff",
      paper: "#ffffff",
    },
    text: {
      primary: "#273142",
      secondary: "#697386",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily:
      "Nunito, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    button: {
      textTransform: "none",
      fontWeight: 800,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: "var(--eventler-bg)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          border: "1px solid var(--eventler-border)",
          background:
            "linear-gradient(180deg, #ffffff 0%, var(--eventler-surface-soft) 100%)",
          boxShadow: "var(--eventler-shadow)",
          overflow: "hidden",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: "var(--eventler-text)",
          fontWeight: 900,
          padding: "22px 24px 10px",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "12px 24px 22px",
          gap: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          textTransform: "none",
          fontWeight: 800,
        },
        outlined: {
          borderColor: "rgba(109, 114, 232, 0.28)",
          color: "#5c61d8",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: "#ffffff",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(109, 114, 232, 0.45)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#6d72e8",
            borderWidth: 2,
          },
        },
        notchedOutline: {
          borderColor: "var(--eventler-border)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 700,
        },
      },
    },
  },
});
