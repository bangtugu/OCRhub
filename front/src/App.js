import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [resultFiles, setResultFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ocrEngine, setOcrEngine] = useState('paddle');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('텍스트 추출');
  const [toast, setToast] = useState(null);
  const textContentRef = useRef(null);
  const dropRef = useRef(null);
  const extractBtnRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (textContentRef.current) textContentRef.current.scrollTop = 0;
  }, [currentIndex]);

  useEffect(() => {
    const div = dropRef.current;
    if (!div) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      div.classList.add('drag-over');
    };
    const handleDragLeave = () => div.classList.remove('drag-over');
    const handleDrop = (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      addFiles(droppedFiles);
    };

    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('drop', handleDrop);

    return () => {
      div.removeEventListener('dragover', handleDragOver);
      div.removeEventListener('dragleave', handleDragLeave);
      div.removeEventListener('drop', handleDrop);
    };
  }, []);

  const addFiles = (newFiles) => {
    setFiles(prevFiles => {
      const existingNames = prevFiles.map(f => f.name);
      const filtered = newFiles.filter(f => !existingNames.includes(f.name));
      return [...prevFiles, ...filtered];
    });
  };

  const handleFileChange = (e) => {
    addFiles(Array.from(e.target.files));
    e.target.value = null;
  };

  const handleRemoveFile = (fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setResultFiles(prev => prev.filter(n => n !== fileName));
    setResults(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleExtract = async () => {
    if (files.length === 0) {
      showToast('파일을 선택해주세요!', extractBtnRef.current);
      return;
    }

    const filesToExtract = [];
    const filesOtherEngine = [];

    files.forEach(file => {
      const result = results[file.name];
      if (!result) {
        filesToExtract.push(file);
      } else if (result.engine !== ocrEngine) {
        filesOtherEngine.push(file);
      }
    });

    if (filesToExtract.length === 0 && filesOtherEngine.length === 0) {
      showToast('이미 추출되었습니다!', extractBtnRef.current);
      return;
    }

    if (filesOtherEngine.length > 0) {
      const confirmResult = window.confirm(
        '선택한 파일 중 일부는 다른 엔진으로 추출되어 있습니다.\n새 엔진으로 추출 결과가 덮어씌워집니다.\n계속 진행하시겠습니까?'
      );
      if (!confirmResult) return;
      filesToExtract.push(...filesOtherEngine);
    }

    if (filesToExtract.length === 0) return;

    setLoading(true);

    // 버튼 애니메이션 시작
    const dots = ['추출 중', '추출 중.', '추출 중..', '추출 중...'];
    let i = 0;
    setLoadingText(dots[i % dots.length]);
    intervalRef.current = setInterval(() => {
      i++;
      setLoadingText(dots[i % dots.length]);
    }, 500);

    const formData = new FormData();
    filesToExtract.forEach(file => formData.append('files', file));
    formData.append('ocr_engine', ocrEngine);

    let port = 8002;
    if (ocrEngine === 'pytesseract') port = 8000;
    else if (ocrEngine === 'easyocr') port = 8001;

    try {
      const response = await fetch(`http://localhost:${port}/extract`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Network response not ok');
      const data = await response.json();

      const updatedResults = { ...results };
      Object.keys(data).forEach(fileName => {
        updatedResults[fileName] = { text: data[fileName], engine: ocrEngine };
      });
      setResults(updatedResults);
      setResultFiles(prev => [...new Set([...prev, ...Object.keys(data)])]);

      showToast('추출 완료!', extractBtnRef.current);
    } catch (error) {
      console.error(error);
      showToast('에러 발생', extractBtnRef.current);
    }

    // 애니메이션 종료
    clearInterval(intervalRef.current);
    setLoading(false);
    setLoadingText('텍스트 추출');
  };

  const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
  const handleNext = () => { if (currentIndex < resultFiles.length - 1) setCurrentIndex(currentIndex + 1); };
  const handleFileClick = (fileName) => { setCurrentIndex(resultFiles.indexOf(fileName)); };

  const handleCopy = (e) => {
    const text = results[resultFiles[currentIndex]]?.text;
    if (text) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('복사되었습니다!', e.target))
        .catch(err => console.error('복사 실패', err));
    }
  };

  const showToast = (message, element) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight - 50;
    if (element) {
      const rect = element.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top;
    }
    setToast({ message, x, y });
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>PDF TO TEXT</h1>

        <select value={ocrEngine} onChange={e => setOcrEngine(e.target.value)}>
          <option value="paddle">PaddleOCR</option>
          <option value="easyocr">EasyOCR</option>
          <option value="pytesseract">pytesseract</option>
        </select>

        <div
          ref={dropRef}
          className="drop-zone"
          onClick={() => document.getElementById('fileInput').click()}
        >
          <p>클릭해서 파일 선택 또는 드래그앤드롭</p>
          <input
            type="file"
            id="fileInput"
            multiple
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h4>선택한 파일들:</h4>
            <ul>
              {files.map((file, idx) => {
                const result = results[file.name];
                let statusClass = 'not-extracted';
                if (result) {
                  statusClass = result.engine === ocrEngine ? 'extracted' : 'other-engine';
                }

                return (
                  <li
                    key={idx}
                    onClick={() => handleFileClick(file.name)}
                    className={`file-item ${statusClass}`}
                  >
                    <span>{file.name}</span>
                    <button
                      className="remove-btn"
                      onClick={e => { e.stopPropagation(); handleRemoveFile(file.name); }}
                    >✕</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button ref={extractBtnRef} onClick={handleExtract} disabled={loading}>
          {loading ? loadingText : '텍스트 추출'}
        </button>
      </header>

      {resultFiles.length > 0 && (
        <div className="navigation">
          <button onClick={handlePrev} disabled={currentIndex===0}>이전</button>
          <span>{currentIndex+1} / {resultFiles.length}</span>
          <button onClick={handleNext} disabled={currentIndex===resultFiles.length-1}>다음</button>
        </div>
      )}

      <div className="results">
        {resultFiles.length > 0 && (
          <div className="result-box">
            <h3 className="filename">{resultFiles[currentIndex]}</h3>
            <button className="copy-btn" onClick={handleCopy}>복사하기</button>
            <pre ref={textContentRef} className="text-content">
              {results[resultFiles[currentIndex]]?.text}
            </pre>
          </div>
        )}
      </div>

      {toast && <div className="toast" style={{ left: toast.x, top: toast.y }}>{toast.message}</div>}
    </div>
  );
}

export default App;
