import { io } from 'socket.io-client';

// ローカルの場合、LANのIPアドレスにしてね（例: http://192.168.0.12:3000）
const socket = io('http://192.168.1.2:3000'); 

export default socket;