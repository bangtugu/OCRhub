# OCR Hub

### 1. 프론트엔드 실행

```
cd front
npm install
npm start
```

브라우저에서 `http://localhost:3000` 접속

------

### 2. OCR 엔진 설치

각 OCR 엔진을 GitHub에서 클론 후, 내부 README.md 지침에 따라 설치 및 실행:

- **pytesseract**
  - [GitHub](https://github.com/bangtugu/pdfreader) 참조
- **EasyOCR**
  - [GitHub](https://github.com/bangtugu/prweasyocr) 참조
- **PaddleOCR**
  - [GitHub](https://github.com/HJKim9810/paddle-back) 참조

```
git clone https://github.com/bangtugu/pdfreader.git
git clone https://github.com/bangtugu/prweasyocr.git
git clone https://github.com/HJKim9810/paddle-back.git
```

------

### 3. 포트 설정 (각 main.py 내부에 설정돼있음)

- pytesseract: `8000`
- EasyOCR: `8001`
- PaddleOCR: `8002`
- FE : `3000`