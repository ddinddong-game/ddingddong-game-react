import { useEffect, useRef, useState, useCallback } from 'react';

const convertLabelToKeycode = (direction: 'left' | 'right' | 'up' | 'down') => {
  // 4. 단순 분류 걍 디렉션 자체를 arrow어쩌구로 바꿔도 될듯
  switch (direction) {
    case 'left':
      return 'ArrowLeft';
    case 'right':
      return 'ArrowRight';
    case 'up':
      return 'ArrowUp';
    case 'down':
      return 'ArrowDown';
    default:
      return '';
  }
};

export const Home = () => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const classifyTimeoutRef = useRef(null);
  const classifier = useRef(null); // classifier 참조 생성
  const [isReadyToCapture, setIsReadyToCapture] = useState(false); // 사진을 찍을 수 있는 상태가 되었는지 = loadReady가 준비된 상태
  const [cameraAccess, setCameraAccess] = useState(false);
  const [isCaptured, setIsCaptured] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
  });
  const [isTrained, setIsTrained] = useState(false);
  const [startClassify, setStartClassify] = useState(false);
  const [progress, setProgress] = useState(0);

  const disableTraining =
    !isCaptured.left || !isCaptured.right || !isCaptured.up || !isCaptured.down;
  const disableClassify = !isTrained;
  const disableClassifyButton = !cameraAccess || !isTrained;

  useEffect(() => {
    // 1. 카메라 접근 권한
    // 카메라 접근 버튼 토글마다 실행
    if (cameraAccess) {
      getCamera(ref);

      const featureExtractor = ml5.featureExtractor('MobileNet', loadReady);
      // classifier.current에 featureExtractor.classification() 메서드를 할당
      // numLabels 옵션을 사용하여 분류기가 예측할 레이블 수를 지정
      // 우리는 4개의 방향을 예측하므로 numLabels를 4로 설정
      const options = { numLabels: 4 };
      classifier.current = featureExtractor.classification(
        ref.current,
        options
      );
    } else {
      if (ref.current && ref.current.srcObject) {
        // 카메라 접근 권한 해제 시 카메라 스트림 해제
        const tracks = (ref.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        ref.current.srcObject = null;
      }
    }
  }, [cameraAccess]);
  const handleGetCamera = () => {
    // 1-1. 카메라 접근 권한 토글
    setCameraAccess((prev) => !prev);
  };

  const getCamera = async (ref: React.RefObject<HTMLVideoElement>) => {
    // 1-2. 카메라 접근 권한
    // 카메라 접근 권한 요청
    const constraints = { video: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing the camera', error);
    }
  };

  const loadReady = () => {
    //1-3. 카메라 접근 권한 뒤 ml5.featureExtractor('MobileNet', loadReady) 실행
    // MobileNet 모델을 사용하여 featureExtractor를 생성할 수 있는지 확인
    console.log('MobileNet ready');
    setIsReadyToCapture(true);
  };

  const handleAddImage = (direction: 'left' | 'right' | 'up' | 'down') => {
    // 2. 이미지 등록
    // classifier.current를 사용하여 메서드를 호출
    if (classifier.current) {
      console.log('이미지 더함', classifier.current);
      setIsCaptured((prev) => ({ ...prev, [direction]: true }));
      classifier.current.addImage(direction);
    }
  };

  const handleStartTraining = () => {
    // 3. 2를 통해 4방향의 이미지 등록이 완료되면 이미지 학습버튼을 누를 수 있음 = 버튼 disabled 속성으로 4개 다 눌러야만 하도록 제한
    if (classifier.current) {
      // 푸반: 진행률 눈에 보이는건 어떨까싶어서 걍 지피티한테 수식 만들어달랬더니 이상한 수식 줌 => 학습 진행률 나타내려면 다시 계산해야함ㅋㅋㅋㅋㅋ
      // 여기서부터
      const initialLoss = 10; // 학습 시작 시의 초기 loss 값
      const targetLoss = 1; // 목표로 하는 최종 loss 값

      classifier.current.train((lossValue) => {
        if (lossValue) {
          console.log('Loss is', lossValue);
          // 현재 lossValue를 사용하여 진행률을 계산
          let progress =
            ((initialLoss - lossValue) / (initialLoss - targetLoss)) * 100;
          progress = Math.min(Math.max(progress, 0), 100); // 진행률이 0과 100 사이의 값이 되도록 조정
          setProgress(progress);
        } else {
          console.log('Training Complete');
          setProgress(100); // 학습 완료 시 프로그레스를 100%로 설정
          setIsTrained(true);
        }
      });
      // 여기까지가 지피티의 주석 및 계산 코드
    }
  };

  const handleToggleClassify = () => {
    // 4. 분류기 실행 토글 = 일시중지 버튼
    // <Classify 분류기>
    // result값이 나옴 => result의 label을 통해 키보드 이벤트 발생시킬 것
    //    (지금 화면에 비치는 방향이 어디방향인지, 학습해둔 값을 토대로 result의 label로 분류해줌)
    setStartClassify((prev) => !prev);
  };

  const handleClassify = () => {
    // 4-2. 분류기 실행 함수
    if (classifier.current && startClassify) {
      classifier.current.classify((error, result) => {
        if (error) {
          console.error(error);
        } else {
          console.log('result', result);
          // 4-3. 분류 결과를 통해 키보드 이벤트 발생
          fireDirection(result[0].label);
          if (startClassify) {
            // 4-7. 일시중지 상태가 아니라면 다시 0.3초 후에 handleClassify 실행 => fireDirection으로 키보드 이벤트 발생 => 반복
            classifyTimeoutRef.current = setTimeout(handleClassify, 300);
            // 일단 넘 빨리, 많이 찍혀서 0.3초마다 실행되도록 함
          }
        }
      });
    }
  };

  useEffect(() => {
    // 4-1. 일시중지 상태가 아니라면 handleClassify 분류기 실행
    if (startClassify && isTrained) {
      handleClassify();
    } else {
      // 분류기 중지, = setTimeout 으로 실행된 handleClassify 함수 중지
      if (classifyTimeoutRef.current !== null) {
        clearTimeout(classifyTimeoutRef.current);
        classifyTimeoutRef.current = null;
      }
    }
  }, [startClassify, isTrained, handleClassify]);

  const fireDirection = (direction: 'left' | 'right' | 'up' | 'down') => {
    // 4-4. 분류 결과의 label을 통해 키보드 이벤트 발생
    const makeKeycode = convertLabelToKeycode(direction);
    // 4-5. 키보드 이벤트를 생성하여 document에 디스패치
    document.dispatchEvent(new KeyboardEvent('keydown', { key: makeKeycode }));
  };

  useEffect(() => {
    // 4-6. addEventListener하여 디스패치된 키보드 이벤트를 처리
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          console.log(`ArrowLeft ${event.key} pressed`);
          break;

        case 'ArrowRight':
          console.log(`ArrowRight ${event.key} pressed`);
          break;

        case 'ArrowUp':
          console.log(`ArrowUp ${event.key} pressed`);
          break;

        case 'ArrowDown':
          console.log(`ArrowDown ${event.key} pressed`);
          break;
        default:
          console.log(`${event.key} pressed`);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div>
      <video ref={ref} autoPlay className="w-350 h-350"></video>
      <button className="border border-cyan-900" onClick={handleGetCamera}>
        Toggle Camera Access
      </button>
      <div className="flex flex-col">
        <button
          className="bg-yellow-300 border border-cyan-900"
          onClick={() => {
            handleAddImage('left');
          }}
          disabled={!cameraAccess || !isReadyToCapture}
        >
          left
        </button>
        <button
          className="bg-yellow-300 border border-cyan-900"
          onClick={() => {
            handleAddImage('right');
          }}
          disabled={!cameraAccess || !isReadyToCapture}
        >
          right
        </button>
        <button
          className="bg-yellow-300 border border-cyan-900"
          onClick={() => {
            handleAddImage('up');
          }}
          disabled={!cameraAccess || !isReadyToCapture}
        >
          up
        </button>
        <button
          className="bg-yellow-300 border border-cyan-900"
          onClick={() => {
            handleAddImage('down');
          }}
          disabled={!cameraAccess || !isReadyToCapture}
        >
          down
        </button>
      </div>

      <div
        className="w-full h-8 bg-gradient-to-r "
        style={{
          background: `linear-gradient(to right, #FF7F00 0%, #FF7F00 ${progress}%, #00FF00 ${progress}%,#00FF00 100%`,
        }}
      >
        progress {progress}
      </div>
      <h2>
        {isCaptured.left && isCaptured.right && isCaptured.up && isCaptured.down
          ? '모든 방향을 기억했어요 training 버튼을 눌러주세요'
          : '모든 방향을 찍어주세요'}
      </h2>
      <h2>남은 방향</h2>
      <p> {isCaptured.left ? '' : 'left '}</p>
      <p> {isCaptured.right ? '' : 'right '}</p>
      <p> {isCaptured.up ? '' : 'up '} </p>
      <p> {isCaptured.down ? '' : 'down '}</p>
      <p>
        {isCaptured.left && isCaptured.right && isCaptured.up && isCaptured.down
          ? ' 없음'
          : ''}
      </p>
      <button
        className={`border border-cyan-900 ${
          disableTraining ? 'bg-gray-300' : 'bg-lime-300'
        }`}
        onClick={handleStartTraining}
        disabled={!cameraAccess || disableTraining}
      >
        1. Start Training 트레이닝먼저~
      </button>
      <button
        className={`border border-cyan-900 ${
          !startClassify ? 'bg-gray-300' : 'bg-lime-300'
        }`}
        onClick={handleToggleClassify}
        disabled={disableClassifyButton}
      >
        2. Toggle 일시중지
      </button>
    </div>
  );
};
