const net = require('net');
const protobuf = require("protobufjs");

let socket = net.createConnection({ port: 7331, host: 'localhost' });

socket.on('connect', async () => {
  const root = await protobuf.load("protos/wrapper.proto");
  let WrapperMessage = root.lookupType("WrapperMessage");

  let sendMessageWrapper = WrapperMessage.create(
    {
      messageType: WrapperMessage.MessageType.SUBMIT_TRANSACTION_BUILDER_REQUEST,
      submitTransactionBuilderRequest: {
        transactionBuilder: {
          address: "TEST9ADDRESS999999999999999999999999999999999999999999999999999999999999999999999",
          value: Buffer.from(toBytesInt32(0)),
          tag: "BRIDGE9TEST9JS9999999999999",
          isBundleHead: true,
          isBundleTail: true
        }
      }
    }
  );

  let requestMessageWrapper = WrapperMessage.create(
    {
      messageType: WrapperMessage.MessageType.FIND_TRANSACTIONS_BY_ADDRESS_REQUEST,
      findTransactionsByAddressRequest: {
        address: "TEST9ADDRESS999999999999999999999999999999999999999999999999999999999999999999999"
      }
    }
  );

  sendRequest(sendMessageWrapper, WrapperMessage)
  sendRequest(requestMessageWrapper, WrapperMessage)
});

var fullBuffer = Buffer.from('')

socket.on('data', async (data) => {
  //not all data is always received in a single 'data' event, so it is stored here
  fullBuffer = Buffer.concat([fullBuffer, data])

  let responselength = parseInt(fullBuffer.toString("hex", 0, 4), 16)
  if (fullBuffer.length == responselength + 4) {
    //check whether transactions were found, the number doesn't have to be 3
    if (responselength < 3) {
      console.log("No transaction found");
      socket.destroy()
      return
    }
    let responsebuffer = fullBuffer.slice(4, responselength + 4)

    const root = await protobuf.load("protos/wrapper.proto");
    let WrapperMessage = root.lookupType("WrapperMessage");

    let message = WrapperMessage.decode(responsebuffer)
    //convert value and timestamp
    let result = message.findTransactionsByAddressResponse.transaction.map(tx => {
      tx.value = parseInt(tx.value.toString('hex'), 16)
      tx.issuanceTimestamp = JSON.parse(tx.issuanceTimestamp)
      tx.attachmentTimestamp = JSON.parse(tx.attachmentTimestamp)
      return tx
    })
    console.log(result);
    console.log("Transactions: " + result.length);
  }
  await new Promise(resolve => setTimeout(resolve, 500))
  socket.destroy()
});

socket.on('close', async () => {
  console.log('Connection closed');
});


function sendRequest(data, WrapperMessage) {
  var message = data
  var err = WrapperMessage.verify(message);
  if (err) {
    throw Error(err);
  }
  var buffer = WrapperMessage.encode(message).finish();
  var consolidatedBuffer = Buffer.allocUnsafe(4 + buffer.length);
  consolidatedBuffer.writeInt32BE(buffer.length, 0);
  buffer.copy(consolidatedBuffer, 4);
  socket.write(consolidatedBuffer);
}

function toBytesInt32(num) {
  arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
  view = new DataView(arr);
  view.setUint32(0, num, false); // byteOffset = 0; litteEndian = false
  return arr;
}