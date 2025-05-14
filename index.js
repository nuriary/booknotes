import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 3000;

env.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

db.connect();

const apiKey = process.env.API_KEY
let searchItems = [];
let reviewItems = [];

app.get("/", async (req,res) => {
// 첫 화면

    const result = await db.query("SELECT * FROM books ORDER BY id DESC"); //등록순 
    const total = result.rows.length;

    res.render("index.ejs", {
        searchItems: searchItems,
        reviewItems : result.rows,
        total : "지금까지 읽은 책 수 : " + total,
        id: "",
        review: "",
    })
});

app.post("/", async (req, res) => {
    const id = req.body.id
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id])
    const book = result.rows[0];

    const date = JSON.stringify(book.pubdate)
    const date1 = date.replace(/"/g, "")
    const date2 = date1.split("T");

    res.send({
        id: book.id,
        title: book.title,
        author: book.author,
        pubdate: date2[0],
        description: book.description,
        isbn: book.isbn,
        publisher: book.publisher,
        review: book.review,
        cover: book.cover
    })
})

app.post("/new", async (req, res) => {
// 책 검색할 시 목록 나열
    try {
        const API_URL = "http://www.aladin.co.kr/ttb/api/ItemSearch.aspx"; //baseURL
        let bookName = req.body.name
        const result = await axios.get(API_URL + `?ttbkey=${apiKey}&Query=${bookName}&QueryType=Title&MaxResults=10&start=1&SearchTarget=Book&output=JS&Version=20131101`);
        const total = result.data.item.length;
        res.render("index.ejs", {
            searchItems: result.data.item,
            reviewItems : reviewItems,
            total : total + "건의 책이 발견되었습니다.",
            id: "",
            review: ""
        })
    } catch (error) {
        console.log(error)
    }
});

app.post("/add", async (req, res) => {
// 새로운 도서를 입력하기
 try {
    let book = JSON.parse(req.body.item)

    // 기존 등록한 도서가 있는지 없는지 확인
    const result = await db.query("SELECT isbn FROM books");
    const isbnList = [];
    result.rows.forEach((book) => isbnList.push(book.isbn));

    // 기존에 등록한 도서가 있으면 리다이렉션
        if (isbnList.includes(book[4])) {
            console.log("이미 등록된 책입니다.")
            return res.redirect("/");
        }
    res.render("new.ejs", {
        title : book[0],
        author : book[1],
        pubDate : book[2],
        description : book[3],
        isbn : book[4],
        publisher : book[5],
        cover : book[6],
        review : "",
        total : "",
        actionPath: "add"
    });
 } catch(err) {
    console.log(err);
 }
});

app.post("/review", async (req, res) => {
// 새로운 리뷰 작성

    const book = req.body;
    const title = book.title;
    const author = book.author;
    const pubDate = book.pubDate;
    const description = book.description;
    const isbn = book.isbn;
    const publisher = book.publisher;
    const cover = book.cover;
    const review = book.review;

 try {
    await db.query(
      "INSERT INTO books (title, author, pubdate, description, isbn, publisher, cover, review) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [title, author, pubDate, description, isbn, publisher, cover, review]
    );
     res.redirect("/");
 } catch(err) {
   console.log(err);
   res.redirect("/");
 }
 });

app.post("/edit", async (req, res) => {
// 기존 리뷰를 수정
    const id = req.body.id;
    const text = req.body.text;

  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    const book = result.rows[0]

    res.render("new.ejs", {
        id: book.id,
        title: book.title,
        author: book.author,
        pubDate: book.pubdate,
        description: book.description,
        isbn: book.isbn,
        publisher: book.publisher,
        cover: book.cover,
        review: text,
        total : "",
        actionPath: "edit"
    })
  } catch(err) {
    console.log(err);
  }
});

app.post("/modify", async (req, res) => {
//수정한 값 넘기고 메인페이지로 리다이렉션

    const review = req.body.review
    const isbn = req.body.isbn
    try {
        await db.query("UPDATE books SET review = ($1) WHERE isbn = $2", [review, isbn]);
        res.redirect("/");
    } catch (err) {
        console.log(err);
    }

})

app.post("/delete", async (req, res) => {
// 기존 리뷰 삭제
    const id = req.body.id
    console.log(id);

 try {
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    console.log("성공적으로 삭제했습니다.");
    res.redirect("/");
} catch(err) {
    console.log(err);
}
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
