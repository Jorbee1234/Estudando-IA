import { Pipe, PipeTransform } from '@angular/core';
import { Dominio, infoDoStatus } from '../constants/status-config';

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(valor: string | null | undefined, dominio: Dominio): string {
    return infoDoStatus(dominio, valor).rotulo;
  }
}
