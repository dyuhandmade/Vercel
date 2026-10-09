import {RequestBodyError} from './request-body';

export type CartChange =
  | {action: 'add'; lines: {merchandiseId: string; quantity: number}[]}
  | {action: 'update'; lines: {id: string; quantity: number}[]}
  | {action: 'remove'; lines: string[]};

const cartLineId = (value: unknown): value is string => typeof value === 'string' && value.length <= 500 &&
  /^gid:\/\/shopify\/CartLine\/[A-Za-z0-9_-]+(?:\?[A-Za-z0-9_=&%.-]+)?$/.test(value);

export function validCartId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 2048 && /^gid:\/\/shopify\/Cart\/[A-Za-z0-9_-]+(?:\?[A-Za-z0-9_=&%.-]+)?$/.test(value);
}

export function cartChange(body: Record<string, unknown>): CartChange {
  if (!['add', 'update', 'remove'].includes(String(body.action)) || !Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 30 ||
      Object.keys(body).some(key => !['action', 'lines'].includes(key))) throw new RequestBodyError('Invalid bag request.');
  if (body.action === 'remove') {
    if (!body.lines.every(cartLineId)) throw new RequestBodyError('Please choose valid bag items.');
    return {action: 'remove', lines: [...new Set(body.lines)]};
  }
  const quantity = (line: unknown): number => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) throw new RequestBodyError('Invalid bag item.');
    const item = line as Record<string, unknown>;
    const allowed = body.action === 'add' ? ['merchandiseId', 'quantity'] : ['id', 'quantity'];
    if (Object.keys(item).some(key => !allowed.includes(key)) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 99) {
      throw new RequestBodyError('Choose a quantity between 1 and 99.');
    }
    return Number(item.quantity);
  };
  if (body.action === 'add') return {action: 'add', lines: body.lines.map(line => {
    const q = quantity(line);
    if (typeof line.merchandiseId !== 'string' || !/^gid:\/\/shopify\/ProductVariant\/\d{1,30}$/.test(line.merchandiseId)) throw new RequestBodyError('Please choose a valid product.');
    return {merchandiseId: line.merchandiseId, quantity: q};
  })};
  return {action: 'update', lines: body.lines.map(line => {
    const q = quantity(line);
    if (!cartLineId(line.id)) throw new RequestBodyError('Please choose a valid bag item.');
    return {id: line.id, quantity: q};
  })};
}
