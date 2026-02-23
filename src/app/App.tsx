import React from 'react';
import { RouterProvider } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nContext';

function ThemedApp() {
  const { config } = useTheme();
  const radixGrayColor = config.grayColor === 'auto' ? 'mauve' : config.grayColor;

  return (
    <Theme
      accentColor={config.accentColor === 'custom' ? 'orange' : config.accentColor}
      grayColor={radixGrayColor}
      radius={config.radius}
      scaling={config.scaling}
      panelBackground={config.panelBackground}
      hasBackground={false}
    >
      <I18nProvider>
        <AppProvider>
          <RouterProvider router={router} />
        </AppProvider>
      </I18nProvider>
    </Theme>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
