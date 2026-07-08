import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log("QR GENERATED");
    process.exit(0);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();
