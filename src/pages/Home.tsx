import { useEffect, useRef, useState, useCallback } from 'react';

const convertLabelToKeycode = (direction: 'left' | 'right' | 'up' | 'down') => {
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

  const getCamera = async (ref: React.RefObject<HTMLVideoElement>) => {
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

  useEffect(() => {
    if (cameraAccess) {
      getCamera(ref);

      const featureExtractor = ml5.featureExtractor('MobileNet', loadReady);
      const options = { numLabels: 4 };
      classifier.current = featureExtractor.classification(
        ref.current,
        options
      );
    } else {
      if (ref.current && ref.current.srcObject) {
        const tracks = (ref.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        ref.current.srcObject = null;
      }
    }
  }, [cameraAccess]);

  useEffect(() => {
    // 키보드 이벤트 처리 함수
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

  const handleGetCamera = () => {
    setCameraAccess((prev) => !prev);
  };

  const handleAddImage = (direction: 'left' | 'right' | 'up' | 'down') => {
    // classifier.current를 사용하여 메서드를 호출
    if (classifier.current) {
      console.log('이미지 더함', classifier.current);
      setIsCaptured((prev) => ({ ...prev, [direction]: true }));
      classifier.current.addImage(direction);
    }
  };

  const handleStartTraining = () => {
    if (classifier.current) {
      // 푸반: 진행률 눈에 보이는건 어떨까싶어서 걍 지피티한테 수식 만들어달랬더니 이상한 수식 줌 => 학습 진행률 나타내려면 다시 계산해야함ㅋㅋㅋㅋㅋ
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
    }
  };

  const handleClassify = () => {
    if (classifier.current && isTrained) {
      classifier.current.classify((error, result) => {
        if (error) {
          console.error(error);
        } else {
          console.log('result', result);
          fireDirection(result[0].label);
          setTimeout(handleClassify, 300);
        }
      });
    }
  };

  useEffect(() => {
    if (!startClassify) {
      console.log('toggle handleClassify');
      handleClassify();
    }
  }, [startClassify]);

  const fireDirection = (direction: 'left' | 'right' | 'up' | 'down') => {
    console.log('fired!!!!', direction);
    const makeKeycode = convertLabelToKeycode(direction);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: makeKeycode }));
  };

  const loadReady = () => {
    console.log('MobileNet ready');
    setIsReadyToCapture(true);
  };

  const handleToggleClassify = () => {
    setStartClassify((prev) => !prev);
  };

  const disableTraining =
    !isCaptured.left || !isCaptured.right || !isCaptured.up || !isCaptured.down;
  const disableClassify = !isTrained;

  const disableClassifyButton = !cameraAccess || !isTrained;

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
        Start Training 트레이닝먼저~
      </button>
      <button
        className={`border border-cyan-900 ${
          !startClassify ? 'bg-gray-300' : 'bg-lime-300'
        }`}
        onClick={handleToggleClassify}
        disabled={disableClassifyButton}
      >
        Toggle 카메라 인식
      </button>
      {/* <button
        className={`border border-cyan-900 ${
          disableClassify ? 'bg-gray-300' : 'bg-lime-300'
        }`}
        onClick={handleClassify}
        disabled={!cameraAccess || !isTrained}
      >
        Start Classify 그담 분류~
      </button> */}
    </div>
  );
};

// const getCamera = async (ref: React.RefObject<HTMLVideoElement>) => {
//   const constraints = { video: true };
//   try {
//     const stream = await navigator.mediaDevices.getUserMedia(constraints);
//     if (ref.current) {
//       ref.current.srcObject = stream;
//     }
//   } catch (error) {
//     console.error('Error accessing the camera', error);
//   }
// };
