/**
 * Entregas documentales individuales y sus versiones (RF-15, RN-19, RN-20).
 */
import { USAR_MOCKS } from './config';
import { entregaMock } from './mock/entrega.mock';
import { entregaHttp } from './http';

export const entregaService = USAR_MOCKS ? entregaMock : entregaHttp;
export default entregaService;
