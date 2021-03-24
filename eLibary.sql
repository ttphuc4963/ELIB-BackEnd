create table reader
(
uniID varchar(20) not null,
email varchar(255) not null ,
password varchar(max) not null,
type nvarchar(20),
fullName nvarchar(100),
phoneNumber char(10) not null,
note nvarchar(max),
profileImg varchar(max),
status nvarchar(20) ,
refreshToken nvarchar(max),
createdTime date,
updatedTime date,
unique (email),
primary key (uniID)
)
;
create table student
(
uniID varchar(20) not null,
graduateDate date,
createdTime date,
updatedTime date,
primary key (uniID)
)
;
create table lecturer
(
uniID varchar(20) not null,
createdTime date,
updatedTime date,
primary key (uniID)
)
;
create table blackList
(
uniID varchar(20) not null,
reason nvarchar(max),
createdTime date,
updatedTime date,
primary key (uniID)
)
;
create table suggestedBuying
(
bookISBN char(13) not null,
readerUniID varchar(20) not null,
reason nvarchar(max),
bookMajor nvarchar(50) not null,
suggestionTimes int,
primary key (bookISBN, readerUniID)
)
;
create table book
(
ISBN char(13) not null,
bookName nvarchar(max) not null,
author nvarchar(max),
publisher nvarchar(max),
publishYear int,
edition int,
language nvarchar(50),
description ntext,
previewContent ntext,
coverImg varchar(max),
numberOfPages int,
total int,
createdTime date,
lastUpdatedTime date,
primary key (ISBN)
)
;
create table bookCopies
(
ID char(15),
ISBN char(13) not null,
numberOfCDs int,
status nvarchar(20),
bookStateDescription nvarchar(100),
createdTime date,
lastUpdatedTime date,
primary key (ID)
)
;
create table favoriteBooks
(
bookISBN char(13) not null,
readerUniID varchar(20) not null,
primary key (bookISBN, readerUniID)
)
;
create table borrowedBook
(
ID int IDENTITY(1,1),
startTime date not null,
endTime date not null,
numberOfExtendedDate int,
numberOfExtension int,
bookCopyID char(15) not null,
readerUniID varchar(20) not null,
primary key (ID)
)
;
create table returnedBook
(
ID int IDENTITY(1,1),
borrowedID int,
startTime date not null,
endTime date not null,
returnedTime date not null,
numberOfExtendedDate int,
numberOfExtension int,
status nvarchar(20),
bookStateDescription nvarchar(100),
penaltyFee int,
reason ntext,
bookCopyID char(15) not null,
readerUniID varchar(20) not null,
primary key (ID)
)
;
create table tag
(
ID int IDENTITY(1,1),
tagName nvarchar(50) not null,
note ntext,
status nvarchar(20),
primary key (ID)
)
;
create table tagsOfBook
(
bookISBN char(13) not null,
tagID int not null,
taggedBy varchar(20),
primary key (bookISBN, tagID)
)
;
create table borrowingSchedule
(
	readerUniID varchar(20) not null,
	bookISBN char(13) not null,
	scheduledDate date,
	status bit,
	primary key(readerUniID, bookISBN)
)
;
create table preBorrow
(
	readerUniID varchar(20) not null,
	bookISBN char(13) not null,
	requestedDate date,
	primary key(readerUniID, bookISBN)
)
;
alter table Student
add constraint FK_Student_Reader
foreign key (uniID) references Reader(uniID)
;
alter table Lecturer
add constraint FK_Lecturer_Reader
foreign key (uniID) references Reader(uniID)
;
alter table BlackList
add constraint FK_BlackList_Reader
foreign key (uniID) references Reader(uniID)
;
alter table SuggestedBuying
add constraint FK_SuggestedBuying_Reader
foreign key (readerUniID) references Reader(uniID)
;
alter table BorrowedBook
add constraint FK_BorrowedBook_Reader
foreign key (readerUniID) references Reader(uniID)
;
alter table BorrowedBook
add constraint FK_BorrowedBook_BookCopies
foreign key (BookCopyID) references BookCopies(ID)
;
alter table ReturnedBook
add constraint FK_ReturnedBook_Reader
foreign key (readerUniID) references Reader(uniID)
;
alter table ReturnedBook
add constraint FK_ReturnedBook_Book
foreign key (BookCopyID) references BookCopies(ID)
;
alter table ReturnedBook
add constraint FK_ReturnedBook_BorrowedBook
foreign key (borrowedID) references borrowedBook(ID)
;
alter table BookCopies
add constraint FK_BookCopies_Book
foreign key (ISBN) references Book(ISBN)
;
alter table TagsOfBook
add constraint FK_TagsOfBook_Book
foreign key (BookISBN) references Book(ISBN)
;
alter table TagsOfBook
add constraint FK_TagsOfBook_Tag
foreign key (TagID) references Tag(ID)
;
alter table TagsOfBook
add constraint FK_TagsOfBook_Reader
foreign key (TaggedBy) references reader(uniID)
;
alter table FavoriteBooks
add constraint FK_FavoriteBooks_Book
foreign key (BookISBN) references Book(ISBN)
;
alter table FavoriteBooks
add constraint FK_FavoriteBooks_Reader
foreign key (ReaderUniID) references Reader(uniID)
;
alter table preBorrow
add constraint FK_preBorrow_Book
foreign key (BookISBN) references Book(ISBN)
;
alter table preBorrow
add constraint FK_preBorrow_Reader
foreign key (ReaderUniID) references Reader(uniID)
;
alter table BorrowingSchedule
add constraint FK_BorrowingSchedule_Book
foreign key (BookISBN) references Book(ISBN)
;
alter table BorrowingSchedule
add constraint FK_BorrowingSchedule_Reader
foreign key (ReaderUniID) references Reader(uniID)
;
CREATE TRIGGER trg_updatedTimeReader
ON reader
AFTER UPDATE
AS
    UPDATE reader
    SET updatedTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_updatedTimeLecturer
ON lecturer
AFTER UPDATE
AS
    UPDATE lecturer
    SET updatedTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_updatedTimeStudent
ON student
AFTER UPDATE
AS
    UPDATE student
    SET updatedTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_updatedTimeBlackList
ON blackList
AFTER UPDATE
AS
    UPDATE blackList
    SET updatedTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_updatedTimeBook
ON book
AFTER UPDATE
AS
    UPDATE book
    SET lastUpdatedTime = GETDATE()
    WHERE ISBN IN (SELECT DISTINCT ISBN FROM Inserted)
;
CREATE TRIGGER trg_updatedTimeBookCopies
ON bookCopies
AFTER UPDATE
AS
    UPDATE bookCopies
    SET lastUpdatedTime = GETDATE()
    WHERE ID IN (SELECT DISTINCT ID FROM Inserted)
;
CREATE TRIGGER trg_createdTimeReader
ON reader
AFTER INSERT
AS
    UPDATE reader
    SET createdTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_createdTimeLecturer
ON lecturer
AFTER INSERT
AS
    UPDATE lecturer
    SET createdTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_createdTimeStudent
ON student
AFTER INSERT
AS
    UPDATE student
    SET createdTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_createdTimeBlackList
ON blackList
AFTER INSERT
AS
    UPDATE blackList
    SET createdTime = GETDATE()
    WHERE uniID IN (SELECT DISTINCT uniID FROM Inserted)
;
CREATE TRIGGER trg_createdTimeBook
ON book
AFTER INSERT
AS
    UPDATE book
    SET createdTime = GETDATE()
    WHERE ISBN IN (SELECT DISTINCT ISBN FROM Inserted)
;
CREATE TRIGGER trg_createdTimeBookCopies
ON bookCopies
AFTER INSERT
AS
    UPDATE bookCopies
    SET createdTime = GETDATE()
    WHERE ID IN (SELECT DISTINCT ID FROM Inserted)
;