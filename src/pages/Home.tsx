import { useEffect, useRef, useState } from 'react';

export const Home = () => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const classifier = useRef(null); // classifier 참조 생성
  const [cameraAccess, setCameraAccess] = useState(false);

  const handleGetCamera = () => {
    setCameraAccess((prev) => !prev);
  };

  useEffect(() => {
    if (cameraAccess) {
      getCamera(ref);

      // classifier.current에 값을 할당하기
      const featureExtractor = ml5.featureExtractor('MobileNet', loadReady);
      classifier.current = featureExtractor.classification(
        ref.current,
        videoReady
      );
    } else {
      if (ref.current && ref.current.srcObject) {
        const tracks = (ref.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        ref.current.srcObject = null;
      }
    }
  }, [cameraAccess]);
  console.log('classifier', classifier.current);

  const handleAddImage = () => {
    // classifier.current를 사용하여 메서드를 호출
    if (classifier.current) {
      console.log('이미지 더함', classifier.current);

      classifier.current.addImage('이미지 더함');
    }
  };

  const handleStartTraining = () => {
    if (classifier.current) {
      classifier.current.train((lossValue) => {
        console.log('Loss is', lossValue);
      });
    }
  };

  const handleClassify = () => {
    if (classifier.current) {
      classifier.current.classify((error, result) => {
        console.log('result', result);
      });
    }
  };

  return (
    <div>
      <video ref={ref} autoPlay className="w-350 h-350"></video>
      <button className="border border-cyan-900" onClick={handleGetCamera}>
        Toggle Camera Access
      </button>
      <button
        className="border border-cyan-900"
        onClick={handleAddImage}
        disabled={!cameraAccess}
      >
        handleAddImage
      </button>
      <button
        className="border border-cyan-900"
        onClick={handleStartTraining}
        disabled={!cameraAccess}
      >
        Start Training
      </button>
      <button
        className="border border-cyan-900"
        onClick={handleClassify}
        disabled={!cameraAccess}
      >
        Start Classify
      </button>
    </div>
  );
};

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

const startTraining = (classifier) => {
  classifier.train((lossValue) => {
    if (lossValue) {
      console.log('Loss is', lossValue);
    } else {
      console.log('Training Complete');
    }
  });
};

function loadReady() {
  console.log('MobileNet ready');
}
function videoReady() {
  console.log('Video ready');
}
