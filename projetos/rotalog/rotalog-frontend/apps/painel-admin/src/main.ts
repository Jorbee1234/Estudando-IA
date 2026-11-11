import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { registrarErro } from './app/core/logging/logger';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  registrarErro('inicialização', err)
);
