class Book {
    constructor(
        isbn,
        bookName,
        author,
        publisher,
        pubYear,
        edition,
        cd,
        status,
        inStock,
        language,
        description,
        firstPage,
        coverImg,
        numberOfPages,
    ) {
        this.isbn = isbn;
        this.bookName = bookName;
        this.author = author;
        this.publisher = publisher;
        this.edition = edition;
        this.cd = cd;
        this.pubYear = pubYear;
        this.status = status;
        this.inStock = inStock;
        this.language = language;
        this.description = description;
        this.firstPage = firstPage;
        this.coverImg = coverImg;
        this.numberOfPages = numberOfPages;
    }
}

module.exports = Book;
