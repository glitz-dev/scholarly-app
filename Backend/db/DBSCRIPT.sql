CREATE TABLE IF NOT EXISTS TBL_USER_SPECIALIZATION
(
	SPECIALIZATION_ID serial not null primary key,
	SPECIALIZATION TEXT NULL,
	CREATED_BY varchar(250) NULL,
	CREATION_DATE timestamp WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS TBL_USERS
(
	USERID BIGSERIAL NOT NULL PRIMARY KEY,
	FIRSTNAME VARCHAR(50) NULL,
	LASTNAME VARCHAR(50) NULL,
	EMAILID VARCHAR(50) NULL,
	UNIVERSITY VARCHAR(50) NULL,
	SPECIALISATION VARCHAR(50) NULL,
	DATEOFBIRTH TIMESTAMP(3) NULL,
	PASSWORD TEXT NULL,
	ISEMAILVERIFIED SMALLINT NULL,
	ACTIVATIONCODE UUID NOT NULL,
	SPECIALIZATION_ID INT null REFERENCES TBL_USER_SPECIALIZATION(SPECIALIZATION_ID),
	CURRENT_POSITION TEXT NULL,
	CURRENT_LOCATION TEXT NULL,
	GENDER SMALLINT NULL,
	CREATION_DATE timestamp WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS TBL_ANNOTATION_RATINGS(
	RATING_ID BIGSERIAL NOT NULL PRIMARY KEY,
	IS_LIKED SMALLINT NULL,
	USER_ID bigint null REFERENCES TBL_USERS(USERID),
	QUESTION_ID int NULL,
	ANSWER_ID int NULL 
);

CREATE TABLE IF NOT exists TBL_COMMENTS(
	COMMENTS_ID BIGSERIAL NOT NULL PRIMARY KEY,
	COMMENT TEXT NULL,
	USER_ID bigint null REFERENCES TBL_USERS(USERID),
	ANSWER_ID int NULL,
	QUESTION_ID int NULL,
	CREATED_BY VARCHAR(200) NULL,
	CREATION_DATE timestamp WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
	IS_SEEN SMALLINT null
	);

CREATE TABLE IF NOT exists tbl_groups (
    group_id SERIAL PRIMARY KEY,
    group_name TEXT,
    user_id bigint null REFERENCES TBL_USERS(USERID),
    created_by VARCHAR(200) NULL,
    created_date timestamp WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(200) NULL,
    updated_date TIMESTAMP WITH TIME ZONE,
    status BOOLEAN
);

CREATE TABLE IF NOT exists tbl_groups_emails (
    group_email_id SERIAL PRIMARY KEY,
    email VARCHAR(250) NULL,
    group_id INTEGER,
    user_id bigint null REFERENCES TBL_USERS(USERID),
    created_by VARCHAR(200) NULL,
    created_date timestamp WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(200) NULL,
    updated_date TIMESTAMP WITH TIME ZONE,
    status BOOLEAN
);

CREATE TABLE IF NOT exists tbl_pdf_question_tags (
    question_id BIGSERIAL PRIMARY KEY,
    question TEXT,
    status_id INTEGER,
    creation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    user_id bigint null REFERENCES TBL_USERS(USERID),
    pdf_uploaded_id INTEGER,
    is_public INTEGER,
    notes TEXT,
    tags TEXT,
    is_deleted BOOLEAN
);

CREATE TABLE IF NOT exists tbl_pdf_answers (
    answer_id BIGSERIAL PRIMARY KEY,
    answer TEXT,
    question_id BIGINT null,
    creation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(200) NULL,
    is_from_pdf BOOLEAN,
    start_index TEXT,
    end_index TEXT,
    horizontal_scroll TEXT,
    vertical_scroll TEXT
);

create table if not exists tbl_pdf_uploads(
	pdf_uploaded_id BIGSERIAL PRIMARY KEY,
	user_id text null,
	pdf_saved_path text null,
	created_date timestamp(3) null,
	created_by text null,
	file_name text null,
	status smallint null,
	pub_med_id text null,
	article text null,
	author text null,
	doi_number text null,
	html_content text null,
	is_public smallint null
);

CREATE TABLE IF NOT exists Log (
	  Id int GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) NOT NULL,
	  Logged TIMESTAMP(6) NOT NULL,
	  Level VARCHAR(50) NOT NULL,
	  Message TEXT NOT NULL,
	  Logger VARCHAR(250) NULL,
	  Exception TEXT NULL,
	  UserName TEXT null,
    CONSTRAINT "PK_dbo.Log" PRIMARY KEY (Id)
  );