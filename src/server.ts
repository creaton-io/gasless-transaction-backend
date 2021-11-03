import app from './app';

const PORT = Number(process.env.PORT) || 3333;

app.listen(PORT, () => {
    global.console.log('Server listening on port', PORT)
});