import bcrypt from 'bcryptjs';
const hash = '$2b$12$jcw7sTLddUI5SgjZM7MyL.1lpLOBFheSL3PP/VxUCd2LFXThknpEy';
const pw = process.argv[2];
const match = await bcrypt.compare(pw, hash);
console.log('Match:', match);
