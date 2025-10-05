const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

async function run() {
    console.log('Running smoke test...');
    // Ensure server is running
    const server = spawn(process.execPath, [path.join(__dirname, 'index.js')], { stdio: 'inherit' });

    await new Promise((r) => setTimeout(r, 800));

    try {
        // create conversation
        const createResp = await axios.post('http://localhost:3001/conversations', { participants: ['alice', 'bob'], type: 'dm' });
        const conv = createResp.data;
        console.log('Created conversation:', conv.id || conv._id || conv);

        // send message
        const msgResp = await axios.post(`http://localhost:3001/conversations/${conv.id || conv._id}/messages`, { body: { text: 'hello from smoke' } }, { headers: { 'x-user-id': 'alice' } });
        console.log('Message create response:', msgResp.data);
    } catch (err) {
        console.error('Smoke test failed:', err.message);
    } finally {
        // kill server
        server.kill();
    }
}

run();
