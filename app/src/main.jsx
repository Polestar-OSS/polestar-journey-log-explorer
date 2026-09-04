import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App';
import { mantineTheme } from './theme/mantineTheme';
import '@fontsource-variable/inter';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/dates/styles.css';
import './theme/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
            <Notifications position="top-right" />
            <App />
        </MantineProvider>
    </React.StrictMode>
);
