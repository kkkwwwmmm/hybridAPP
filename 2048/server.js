const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client')));
app.use(express.json());
const USER_COOKIE_KEY = 'USER';
const USERS_JSON_FILENAME = 'data.json';

async function fetchAllUsers() {
    const data = await fs.readFile(USERS_JSON_FILENAME);
    const users = JSON.parse(data.toString());
    return users;
}

async function fetchUser(username) {
    const users = await fetchAllUsers();
    const user = users.find((user) => user.username === username);
    return user;
}

async function createUser(newUser) {
    const users = await fetchAllUsers();
    users.push(newUser);
    await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users));
}


app.use(express.static(path.join(__dirname, 'client')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    // 'user'라는 쿠키 데이터를 가져옴
    // 쿠키가 존재하지 않을 경우 로그인이 되지 않았다는 뜻
    const userCookie = req.cookies[USER_COOKIE_KEY];
    
    if (userCookie) {
        // 쿠키가 존재하는 경우, 쿠키 VALUE를 JS 객체로 변환
        const userData = JSON.parse(userCookie);
        // user 객체에 저장된 username이 json에 존재하는 경우,
        // 유효한 user이며 로그인이 잘 되어 있다는 뜻.
        const user = await fetchUser(userData.username);
        if (user) {
            // JS 객체로 변환된 user 데이터에서 username, name, password를 추출하여 클라이언트에 렌더링
            res.status(200).send(`
                <a href="/back">BACK</a>
                <h1>name: ${userData.name},id: ${userData.username}, password: ${userData.password}</h1>
            `);
            return;
        }
    }

    // 쿠키가 존재하지 않는 경우, 로그인 되지 않은 것으로 간주
    res.status(200).send(`
        <a href="/2048.html">GO TO 2048</a>
    `);
});

app.post('/signup', async (req, res) => {
    const { username, name, password } = req.body;
    const user = await fetchUser(username);

    // 이미 존재하는 username일 경우 회원 가입 실패
    if (user) {
        res.status(400).send(`<a href="/2048.html">GO TO 2048</a><br>이미 존재하는 아이디: ${username}`)
        return;
    }

    // 아직 가입되지 않은 username인 경우 json에 저장
    // KEY = username, VALUE = { name, password }
    const newUser = {
        username,
        name,
        password,
    };
    await createUser({
        username,
        name,
        password,
    });

    // json에 저장된 user 객체를 문자열 형태로 변환하여 쿠키에 저장
    res.cookie(USER_COOKIE_KEY, JSON.stringify(newUser));
    // 가입 완료 후, 쿠키확인 페이지로 이동
    res.redirect('/');
});



app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await fetchUser(username);

    // 가입 안 된 username인 경우
    if (!user) {
        res.status(400).send(`<a href="/2048.html">GO TO 2048</a><br>없는 아이디: ${username}`);  
        return;
    }
    // 비밀번호가 틀렸을 경우
    if (password !== user.password) {
        res.status(400).send('<a href="/2048.html">GO TO 2048</a><br>비밀번호가 틀렸습니다');
        
        return;
    }

    // json에 저장된 user 객체를 문자열 형태로 변환하여 쿠키에 저장
    res.cookie(USER_COOKIE_KEY, JSON.stringify(user));
    // 로그인(쿠키 발급) 후, 쿠키확인 페이지로 이동
    res.redirect('/');
});

app.get('/back', (req, res) => {
    res.redirect('/2048.html');
});

app.get('/logout',(req, res )=> {
    // 쿠키 삭제 후 쿠키확인 페이지로 이동
    res.clearCookie(USER_COOKIE_KEY);
    res.redirect('/');
})

app.post('/saveVariable', async (req, res) => {
    try {
        // 쿠키얻기
        const userCookie = req.cookies[USER_COOKIE_KEY];

        // 로그인 확인
        if (!userCookie) {
            res.status(401).json({ message: 'arlet(로그인은 안돼있습니다)' });
            return;
        }

        // 쿠키Parse 하고 user객체 얻기
        const user = JSON.parse(userCookie);

        // 모든 user를 JSON으로부터 Fetch  
        const users = await fetchAllUsers();

        // 유저 찾기
        const userIndex = users.findIndex(u => u.username === user.username);

        // 유저가 없으면 에러보내기
        if (userIndex === -1) {
            res.status(404).send('User not found');
            return;
        }

        // 스코어 업데잍트
        users[userIndex].score = req.body.score;

        // json 파일로 저장
        await fs.writeFile(USERS_JSON_FILENAME, JSON.stringify(users, null, 2));

        // 성공 응답
        res.status(200).send('Score saved successfully.');
    } catch (error) {
        // 오류
        console.error('Error saving score:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/users', async (req, res) => {
    try {
        //  JSON file 읽기
        const jsonData = await fs.readFile(USERS_JSON_FILENAME, 'utf-8');
        
        // json을 파싱해 자바 배열얻기
        const users = JSON.parse(jsonData);

        // 정렬
        const sortedUsers = users.sort((a, b) => b.score - a.score);

        // 값 입력
        const topUsers = sortedUsers.slice(0, 10).map(user => ({ name: user.name, score: user.score }));

        // 전송
        res.status(200).json(topUsers);
    } catch (error) {
        console.error('Error reading JSON file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/bscore', async (req, res) => {
    try {
        //  JSON file 읽기
        const jsonData = await fs.readFile(USERS_JSON_FILENAME, 'utf-8');
        
        // json을 파싱해 자바 배열얻기
        const users = JSON.parse(jsonData);

        // 정렬
        const sortedUsers = users.sort((a, b) => b.score - a.score);

        // 값 입력 (최고 점수 유저만 선택)
        const topUser = sortedUsers.length > 0 ? { name: sortedUsers[0].name, score: sortedUsers[0].score } : null;

        // 전송
        res.status(200).json(topUser);
    } catch (error) {
        console.error('Error reading JSON file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(5500, () => {
    console.log('server is running at 5500');
});


