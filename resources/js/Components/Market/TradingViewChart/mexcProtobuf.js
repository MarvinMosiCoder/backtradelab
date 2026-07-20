import protobuf from 'protobufjs/light.js';

const { Field, Type } = protobuf;

const PublicSpotKline = new Type('PublicSpotKlineV3Api')
  .add(new Field('interval', 1, 'string'))
  .add(new Field('windowStart', 2, 'int64'))
  .add(new Field('openingPrice', 3, 'string'))
  .add(new Field('closingPrice', 4, 'string'))
  .add(new Field('highestPrice', 5, 'string'))
  .add(new Field('lowestPrice', 6, 'string'))
  .add(new Field('volume', 7, 'string'))
  .add(new Field('amount', 8, 'string'))
  .add(new Field('windowEnd', 9, 'int64'));

const PushDataWrapper = new Type('PushDataV3ApiWrapper')
  .add(new Field('channel', 1, 'string'))
  .add(new Field('publicSpotKline', 308, 'PublicSpotKlineV3Api'))
  .add(new Field('symbol', 3, 'string'))
  .add(new Field('symbolId', 4, 'string'))
  .add(new Field('createTime', 5, 'int64'))
  .add(new Field('sendTime', 6, 'int64'));

PushDataWrapper.add(PublicSpotKline);

export async function decodeMexcSpotMessage(data) {
  if (typeof data === 'string') return JSON.parse(data);
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
  if (!(buffer instanceof ArrayBuffer)) return null;
  return PushDataWrapper.toObject(PushDataWrapper.decode(new Uint8Array(buffer)), {
    longs: Number,
    defaults: false,
  });
}
