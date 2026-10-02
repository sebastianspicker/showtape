import type { NextRequest } from 'next/server';
import { jsonResponse } from '../http/response';
import { optionsNoContent } from '../http/helpers';

export function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

export function GET(request: NextRequest) {
  return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, 200, request);
}
