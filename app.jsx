import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- Firebase 초기화 ---
let auth, db, appId;
try {
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };
  
  appId = "math-tutor-class"; // 고유 앱 ID 지정

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase 초기화 에러:", error);
}

// --- 핵심 6개 문제 카테고리 정리 ---
const PROBLEM_TYPES = [
  { id: 'num_age', name: '수와 자릿수, 나이 문제', icon: '🔢', desc: '어떤 수, 연속하는 수, 자릿수, 나이 변화' },
  { id: 'price_qty', name: '가격과 수량 증감 문제', icon: '💰', desc: '물건 가격, 원가/정가, 동물 다리, 학생 수 증감' },
  { id: 'surplus_ratio', name: '과부족과 비례 문제', icon: '🍎', desc: '물건 나누어 주기, 텐트/의자 배정, 전체의 비율' },
  { id: 'geometry_work', name: '도형과 일의 양 문제', icon: '📐', desc: '도형의 둘레와 넓이, 함께 일하여 완성하는 시간' },
  { id: 'speed_1', name: '거속시 (왕복, 시간차)', icon: '🚶', desc: '속력이 바뀌는 왕복 이동, 두 수단의 도착 시간차' },
  { id: 'speed_2', name: '거속시 (마주보기, 기차)', icon: '🚂', desc: '마주보고 걷기, 호수 둘레 돌기, 기차 터널 통과' },
];

// --- 문제 데이터 ---
const PROBLEMS = {
  num_age: [
    {
      level: '하', title: '잘못 계산한 수 구하기', finalAnswer: "11",
      text: "어떤 수에 4를 더해야 할 것을 잘못해서 4를 곱했더니 구하려고 했던 수보다 29만큼 커졌다. 이때 어떤 수를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "우리가 구하고자 하는 대상인 '어떤 수'를 미지수 $x$로 두겠습니다. 채팅창의 어떤 버튼을 누를까요?", options: ["어떤 수", "더해야 할 수", "곱한 결과"], correctOptionIndex: 0, successMsg: "맞아요! '어떤 수'를 $x$로 두면 식이 간단해집니다.", hint: "문제의 맨 마지막에 무엇을 구하라고 했는지 살펴보세요." },
        { title: "2. 방정식 세우기", instruction: "어떤 수 $x$에 4를 곱한 결과($4x$)가, 원래 구하려고 했던 수($x+4$)보다 29만큼 크다고 합니다. 올바른 방정식은 무엇일까요?", options: ["$4x = (x+4) - 29$", "$4x = (x+4) + 29$", "$x+4 = 4x + 29$"], correctOptionIndex: 1, successMsg: "아주 잘했어요! (잘못 계산한 식) = (바르게 계산한 식) + 29 의 구조를 완벽하게 세웠습니다.", hint: "4를 곱한 쪽이 더 크니까, 바르게 계산한 쪽($x+4$)에 29를 더해주어야 양쪽이 같아집니다." },
        { title: "3-1. 이항하기", parentTitle: "3. 방정식 풀기", instruction: "$4x = x + 4 + 29$ 에서 우변의 $x$를 좌변으로 이항하고 우변의 숫자를 계산해봅시다. 바르게 정리한 식은?", options: ["$4x - x = 33$", "$4x + x = 33$", "$4x - x = 25$"], correctOptionIndex: 0, successMsg: "잘했어요! $+x$가 넘어와서 $-x$가 되고, $4+29=33$이 됩니다.", hint: "이항할 때는 부호가 반대로 바뀐다는 것을 잊지 마세요." },
        { title: "3-2. x 구하기", parentTitle: "3. 방정식 풀기", instruction: "식을 마저 정리하면 $3x = 33$ 이 됩니다. 양변을 3으로 나누면 $x$는 얼마일까요?", options: ["$x = 9$", "$x = 11$", "$x = 13$"], correctOptionIndex: 1, successMsg: "정확합니다! 어떤 수는 11이었네요.", hint: "3 곱하기 무엇이 33이 되는지 생각해보세요." },
        { title: "4. 확인하기", instruction: "어떤 수가 11이라면, 잘못 계산한 값($11 \\times 4$)은 44이고, 바르게 계산할 값($11 + 4$)은 15입니다. 44는 15보다 29만큼 큰 것이 맞나요?", options: ["네, 맞습니다!", "아니요, 틀립니다."], correctOptionIndex: 0, successMsg: "완벽해요! 어떤 수 문제의 기초를 훌륭하게 마스터했습니다.", hint: "15 + 29 를 계산해보세요." }
      ]
    },
    {
      level: '중', title: '연속하는 세 홀수 문제', finalAnswer: "11",
      text: "연속하는 세 홀수의 합이 39일 때, 이 세 홀수 중 가장 작은 수를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "가장 작은 홀수를 미지수 $x$로 두겠습니다. 그렇다면 연속하는 세 홀수는 어떻게 표현할 수 있을까요?", expected: "x, x+2, x+4" },
        { title: "2. 방정식 세우기", instruction: "이 세 홀수의 합이 39라는 것을 이용하여 방정식을 세워볼까요?", expected: "x + (x+2) + (x+4) = 39" },
        { title: "3. 방정식 풀기", instruction: "세운 방정식을 풀어서 가장 작은 수인 $x$를 구해보세요.", expected: "x = 11" },
        { title: "4. 확인하기", instruction: "가장 작은 수가 11이라면 세 홀수는 11, 13, 15가 됩니다. 세 수를 모두 더하면 39가 맞나요? (네/아니요)", expected: "네" }
      ]
    },
    {
      level: '중', title: '자릿수 바꾸기 문제', finalAnswer: "63",
      text: "십의 자리 숫자가 6인 두 자리 자연수가 있다. 이 자연수의 십의 자리 숫자와 일의 자리 숫자를 바꾼 수는 처음 수보다 27만큼 작다고 할 때, 처음 수를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "십의 자리는 6으로 알려져 있어요. 무엇을 미지수 $x$로 두는 것이 좋을까요?", expected: "일의 자리 숫자" },
        { title: "2. 방정식 세우기", instruction: "처음 수는 $(60+x)$ 입니다. 십의 자리와 일의 자리를 바꾼 수는 $(10x+6)$ 이 되겠죠. '(바꾼 수) = (처음 수) - 27' 이라는 방정식을 세워보세요.", expected: "10x + 6 = (60 + x) - 27" },
        { title: "3. 방정식 풀기", instruction: "세운 방정식을 풀어서 일의 자리 숫자인 $x$를 구해보세요.", expected: "x = 3" },
        { title: "4. 답 구하기", instruction: "일의 자리 숫자 $x$가 3이라면, 문제에서 요구한 '처음 수'는 무엇인가요?", expected: "63" }
      ]
    },
    {
      level: '중', title: '나이 변화 문제', finalAnswer: "3",
      text: "현재 아버지의 나이는 48세이고 아들의 나이는 14세이다. 아버지의 나이가 아들의 나이의 3배가 되는 것은 몇 년 후인가?",
      steps: [
        { title: "1. 미지수 정하기", instruction: "이 문제에서 구하고자 하는 것, 즉 무엇을 $x$로 두어야 할까요? 채팅창에 입력해주세요.", expected: "몇 년 후 (또는 x년 후)" },
        { title: "2. 방정식 세우기", instruction: "$x$년 후에는 아버지와 아들의 나이 모두 똑같이 $x$살씩 늘어납니다. '(x년 후 아버지 나이) = 3 \\times (x년 후 아들 나이)' 라는 방정식을 세워보세요.", expected: "48 + x = 3(14 + x)" },
        { title: "3. 방정식 풀기", instruction: "세운 방정식의 괄호를 풀고 식을 정리하여 $x$의 값을 구해보세요.", expected: "x = 3" },
        { title: "4. 확인하기", instruction: "3년 후에 아버지의 나이는 51세, 아들의 나이는 17세가 됩니다. 51은 17의 3배가 맞나요? (네/아니요)", expected: "네" }
      ]
    }
  ],
  price_qty: [
    {
      level: '하', title: '남는 돈 비교하기', finalAnswer: "1400",
      text: "슬기는 4000원을, 연지는 3000원을 가지고 있다. 슬기가 어떤 볼펜 2자루를 사고, 연지는 같은 볼펜 1자루와 400원짜리 연필 한 자루를 샀을 때 두 사람에게 남은 돈이 서로 같았다. 볼펜 한 자루의 가격을 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하려고 하는 '볼펜 한 자루의 가격'을 미지수 $x$로 두겠습니다. 그렇다면 슬기가 볼펜 2자루를 사고 남은 돈은 어떻게 될까요?", options: ["$4000 - x$", "$4000 - 2x$", "$4000 + 2x$"], correctOptionIndex: 1, successMsg: "맞아요! 가진 돈에서 산 물건의 가격($2x$)을 빼주면 됩니다.", hint: "4000원에서 볼펜 2자루의 가격을 빼보세요." },
        { title: "2. 방정식 세우기", instruction: "연지는 3000원에서 볼펜 1자루($x$)와 연필 1자루(400)를 샀습니다. 두 사람의 남은 돈이 같다는 방정식은?", options: ["$4000 - 2x = 3000 - (x+400)$", "$4000 - 2x = 3000 - x + 400$", "$4000 - 2x = 3000 - 400x$"], correctOptionIndex: 0, successMsg: "아주 잘했어요! 연지가 쓴 돈 전체를 괄호로 묶어서 빼주는 것이 중요합니다.", hint: "연지가 쓴 돈은 $(x + 400)$원 입니다. 3000원에서 이를 통째로 빼주어야 해요." },
        { title: "3-1. 괄호 풀기", parentTitle: "3. 방정식 풀기", instruction: "$4000 - 2x = 3000 - (x+400)$ 에서 우변의 괄호를 풀고 숫자를 계산해봅시다. 우변은 어떻게 정리될까요?", options: ["$3000 - x + 400 = 3400 - x$", "$3000 - x - 400 = 2600 - x$", "$3000 - 400x$"], correctOptionIndex: 1, successMsg: "훌륭합니다! 괄호 앞의 '-' 분배를 잘 해냈습니다.", hint: "$- (x+400)$ 은 $-x - 400$ 이 됩니다. 3000에서 400을 빼보세요." },
        { title: "3-2. 이항하고 x 구하기", parentTitle: "3. 방정식 풀기", instruction: "$4000 - 2x = 2600 - x$ 가 되었습니다. 이항하여 정리하면 $-x = -1400$ 이 됩니다. $x$는 얼마일까요?", options: ["$x = 1000$", "$x = 1200$", "$x = 1400$"], correctOptionIndex: 2, successMsg: "정확합니다! 볼펜 한 자루는 1400원이군요.", hint: "양변의 마이너스 부호를 모두 플러스로 바꿔주세요." },
        { title: "4. 확인하기", instruction: "볼펜이 1400원이면, 슬기는 2800원을 써서 1200원이 남고, 연지는 1800원(1400+400)을 써서 1200원이 남습니다. 남은 돈이 같나요?", options: ["네, 같습니다!", "아니요, 다릅니다."], correctOptionIndex: 0, successMsg: "완벽해요! 물건 구매 시 남는 돈에 대한 식을 훌륭하게 세웠습니다.", hint: "슬기와 연지의 남은 돈을 비교해보세요." }
      ]
    },
    {
      level: '중', title: '합하여 산 물건의 개수', finalAnswer: "10",
      text: "한 개에 800원 하는 사과와 한 개에 1500원 하는 배를 합하여 16개를 사고 총 17000원을 지불하였다. 구입한 사과는 몇 개인지 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "우리가 알아내야 하는 '사과의 개수'를 미지수 $x$로 두겠습니다. 채팅창에 '사과의 개수'라고 입력해보세요.", expected: "사과의 개수" },
        { title: "2. 방정식 세우기", instruction: "사과가 $x$개라면 배는 전체 16개에서 사과를 뺀 $(16-x)$개가 됩니다. 두 과일의 가격을 합쳐서 17000원이 되도록 방정식을 세워보세요.", expected: "800x + 1500(16-x) = 17000" },
        { title: "3. 방정식 풀기", instruction: "방정식의 괄호를 풀고 식을 정리하여 사과 개수 $x$를 구해보세요.", expected: "x = 10" },
        { title: "4. 확인하기", instruction: "사과 10개(8000원)와 배 6개(9000원)를 사면 총 16개가 맞고, 두 가격을 더하면 17000원이 나오나요? (네/아니요)", expected: "네" }
      ]
    },
    {
      level: '중', title: '할인하여 팔기', finalAnswer: "2000",
      text: "어떤 상품의 원가에 5%의 이익을 붙여 정가를 정하였다. 이 정가에서 600원을 할인한 판매 가격이 1500원일 때, 상품의 원가를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "기준이 되는 처음 가격인 '원가'를 미지수 $x$로 두겠습니다. 채팅창에 '원가'라고 적어주세요.", expected: "원가" },
        { title: "2. 방정식 세우기", instruction: "정가($1.05x$)에서 600원을 뺀 실제 판매 가격이 1500원이라는 방정식을 세워볼까요?", expected: "1.05x - 600 = 1500" },
        { title: "3. 방정식 풀기", instruction: "$1.05x - 600 = 1500$ 을 풀어서 상품의 원가 $x$를 구해보세요. (힌트: 양변에 100을 곱하면 편합니다)", expected: "x = 2000" },
        { title: "4. 확인하기", instruction: "원가 2000원에 5%(100원) 이익을 붙이면 정가는 2100원입니다. 여기서 600원을 할인하면 판매가가 1500원이 되는 것이 맞나요? (네/아니요)", expected: "네" }
      ]
    },
    {
      level: '중', title: '학생 수 증가량 비교', finalAnswer: "320",
      text: "어느 학교의 작년 전체 학생 수는 800명이었다. 올해는 작년에 비하여 남학생은 10% 증가하고, 여학생은 변화가 없어서 전체적으로 6% 증가하였다. 작년의 여학생 수를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하려고 하는 '작년의 여학생 수'를 미지수 $x$로 두겠습니다. 전체 학생이 800명이면 작년의 남학생 수는 식으로 어떻게 되나요?", expected: "800 - x" },
        { title: "2. 방정식 세우기", instruction: "여학생 수의 변화가 없으니 '남학생 증가한 인원'이 곧 '전체 증가한 인원'과 같습니다. 이 사실로 방정식을 세우면?", expected: "0.1(800-x) = 800 * 0.06" },
        { title: "3. 방정식 풀기", instruction: "양변에 10을 곱하고 괄호를 풀어 정리하여 작년 여학생 수 $x$를 구해보세요.", expected: "x = 320" },
        { title: "4. 확인하기", instruction: "여학생이 320명이면 남학생은 480명입니다. 480명의 10%는 48명인데, 이는 800명의 6%인 48명과 동일한가요? (네/아니요)", expected: "네" }
      ]
    }
  ],
  surplus_ratio: [
    {
      level: '하', title: '공책 나누어 주기', finalAnswer: "6",
      text: "학생들에게 공책을 나누어 주려고 한다. 한 학생에게 4권씩 나누어 주면 5권이 남고, 6권씩 나누어 주면 7권이 부족하다고 한다. 이때 학생 수는 몇 명일까요?",
      steps: [
        { title: "1. 미지수 정하기", instruction: "공책의 총 개수를 비교하기 위해, 물건을 받는 대상인 '학생 수'를 미지수 $x$로 두어야 해요. 무엇을 미지수로 둘까요?", options: ["공책의 개수", "학생 수", "남은 공책"], correctOptionIndex: 1, successMsg: "맞습니다! '학생 수'를 $x$로 두면 남거나 모자란 공책의 상황을 식으로 표현하기 쉬워요.", hint: "가장 기본이 되는 사람의 수를 $x$로 두는 것이 유리합니다." },
        { title: "2. 방정식 세우기", instruction: "공책의 전체 개수가 변하지 않는다는 점을 이용합니다. 4권씩 줄 때 남는 상황과 6권씩 줄 때 부족한 상황을 등식으로 만들어보세요.", options: ["$4x - 5 = 6x + 7$", "$4(x+5) = 6(x-7)$", "$4x + 5 = 6x - 7$"], correctOptionIndex: 2, successMsg: "정확해요! 공책의 개수를 나타내는 두 식을 잘 같다고 놓았네요.", hint: "4권씩 $x$명에게 주면 $4x$권이 필요하고 거기서 5권이 남으니 $+5$, 6권씩 주면 $6x$권이 필요하고 7권이 부족하니 $-7$ 입니다." },
        { title: "3-1. 이항하기", parentTitle: "3. 방정식 풀기", instruction: "$4x + 5 = 6x - 7$ 에서 $x$항은 좌변으로, 상수항은 우변으로 이항해보세요. 바르게 이항한 식은 무엇일까요?", options: ["$4x + 6x = 7 + 5$", "$4x - 6x = -7 - 5$", "$4x - 6x = -7 + 5$"], correctOptionIndex: 1, successMsg: "잘했어요! $+6x$가 넘어가서 $-6x$가 되고, $+5$가 넘어가서 $-5$가 되었습니다.", hint: "이항할 때는 부호가 반대로 바뀐다는 점 잊지 마세요!" },
        { title: "3-2. x 구하기", parentTitle: "3. 방정식 풀기", instruction: "식을 정리하면 $-2x = -12$ 가 됩니다. 양변을 -2로 나누면 $x$는 얼마일까요?", options: ["$x = 5$", "$x = 6$", "$x = 7$"], correctOptionIndex: 1, successMsg: "훌륭해요! 학생 수는 6명이군요.", hint: "마이너스(-) 부호를 양쪽에서 같이 없애주고 12를 2로 나누면 됩니다." },
        { title: "4. 확인하기", instruction: "학생이 6명일 때, 공책의 개수를 양쪽 식에 넣어 확인해볼까요? $4 \\times 6 + 5 = 29$, $6 \\times 6 - 7 = 29$. 맞나요?", options: ["네, 같습니다!", "아니요, 다릅니다."], correctOptionIndex: 0, successMsg: "완벽합니다! 과부족 문제의 기초를 마스터했어요.", hint: "두 식의 결과가 동일하게 나오면 방정식을 올바르게 푼 것이랍니다." }
      ]
    },
    {
      level: '중', title: '긴 의자 배정 문제', finalAnswer: "57",
      text: "강당에 있는 긴 의자에 학생들이 앉는데 4명씩 앉으면 9명이 앉지 못하고, 5명씩 앉으면 남는 의자는 없지만 마지막 의자에는 2명이 앉는다고 한다. 학생 수를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "학생들이 앉는 대상인 무엇을 미지수 $x$로 두어야 할까요?", expected: "긴 의자의 개수 (또는 의자의 개수)" },
        { title: "2. 방정식 세우기", instruction: "의자가 $x$개일 때, 5명씩 꽉 차게 앉은 의자는 $(x-1)$개이고 마지막 1개에만 2명이 앉아 있습니다. 이 점을 이용해서 학생 수에 대한 방정식을 세워보세요.", expected: "4x + 9 = 5(x - 1) + 2" },
        { title: "3. 방정식 풀기", instruction: "방정식 $4x + 9 = 5(x - 1) + 2$ 의 괄호를 풀고 $x$(의자의 개수)를 구해보세요.", expected: "x = 12" },
        { title: "4. 답 구하기", instruction: "의자의 개수 $x$가 12개라면, 문제에서 구하라고 한 최종 답인 **'전체 학생 수'**는 몇 명인가요?", expected: "57" }
      ]
    },
    {
      level: '중', title: '비율과 전체 학생 수', finalAnswer: "28",
      text: "피타고라스 제자의 1/2은 수의 아름다움을 탐구하고, 1/4은 자연의 이치를 연구하며, 1/7은 사색에 잠겨 있다. 그 외에 여자인 제자가 3명일 때, 피타고라스 제자는 모두 몇 명인지 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하려고 하는 대상인 '전체 제자의 수'를 미지수 $x$로 두겠습니다. 채팅창에 '전체 제자 수'라고 적어주세요.", expected: "전체 제자 수" },
        { title: "2. 방정식 세우기", instruction: "각각의 제자 그룹(1/2, 1/4, 1/7, 나머지 3명)을 모두 합치면 전체 제자 수($x$)가 된다는 방정식은?", expected: "x/2 + x/4 + x/7 + 3 = x" },
        { title: "3. 방정식 풀기", instruction: "양변에 분모들의 최소공배수인 28을 곱해서 분수를 없애고 $x$를 구해보세요.", expected: "x = 28" },
        { title: "4. 확인하기", instruction: "28명의 1/2(14명), 1/4(7명), 1/7(4명), 그리고 3명을 모두 더하면 28명이 딱 맞게 떨어지나요? (네/아니요)", expected: "네" }
      ]
    }
  ],
  geometry_work: [
    {
      level: '하', title: '직사각형의 둘레', finalAnswer: "6",
      text: "가로의 길이가 세로의 길이보다 3cm 더 긴 직사각형이 있습니다. 이 직사각형의 둘레의 길이가 30cm일 때, 직사각형의 세로의 길이를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "우리가 구해야 하는 '세로의 길이'를 미지수 $x$로 두겠습니다. 그렇다면 가로의 길이는 어떻게 표현할까요?", options: ["$x - 3$", "$x + 3$", "$3x$"], correctOptionIndex: 1, successMsg: "맞아요! 가로가 세로보다 3cm 기니까 $x+3$ 으로 두면 됩니다.", hint: "세로 $x$ 에 3을 더해주면 됩니다." },
        { title: "2. 방정식 세우기", instruction: "직사각형의 둘레는 $2 \\times (가로 + 세로)$ 입니다. 둘레가 30cm라는 것을 이용해 방정식을 세워보세요.", options: ["$x + (x+3) = 30$", "$2(x + x + 3) = 30$", "$x(x+3) = 30$"], correctOptionIndex: 1, successMsg: "아주 잘했어요! 둘레를 구하는 공식을 정확히 활용했네요.", hint: "가로 $(x+3)$ 와 세로 $x$ 를 더한 뒤 전체에 2배를 해주어야 해요." },
        { title: "3-1. 괄호 풀기", parentTitle: "3. 방정식 풀기", instruction: "먼저 식 안쪽을 정리하면 $2(2x + 3) = 30$ 이 됩니다. 분배법칙으로 괄호를 풀면 어떻게 될까요?", options: ["$4x + 3 = 30$", "$2x + 6 = 30$", "$4x + 6 = 30$"], correctOptionIndex: 2, successMsg: "잘했어요! $2 \\times 2x = 4x$, $2 \\times 3 = 6$ 이 정확하게 분배되었습니다.", hint: "괄호 밖의 2를 안쪽의 $2x$ 와 $+3$ 에 각각 곱해주세요." },
        { title: "3-2. x 구하기", parentTitle: "3. 방정식 풀기", instruction: "$4x + 6 = 30$ 에서 $+6$을 이항하면 $4x = 24$ 가 됩니다. 양변을 4로 나누면 $x$는 얼마일까요?", options: ["$x = 4$", "$x = 5$", "$x = 6$"], correctOptionIndex: 2, successMsg: "정확합니다! 세로의 길이는 6cm였네요.", hint: "$4 \\times ? = 24$ 구구단 4단을 생각해보세요." },
        { title: "4. 확인하기", instruction: "세로가 6cm라면 가로는 9cm가 됩니다. 가로와 세로를 더해서 2배를 하면 둘레인 30cm가 나오나요?", options: ["네, 나옵니다!", "아니요, 틀립니다."], correctOptionIndex: 0, successMsg: "완벽해요! 도형 문제의 기초를 훌륭하게 통과했습니다.", hint: "$2 \\times (9 + 6)$ 을 계산해보세요." }
      ]
    },
    {
      level: '중', title: '사다리꼴의 넓이', finalAnswer: "10",
      text: "윗변의 길이가 8cm, 높이가 4cm인 사다리꼴의 넓이가 36cm²일 때, 이 사다리꼴의 아랫변의 길이를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하고자 하는 것을 $x$로 둡시다. 무엇을 미지수 $x$로 두면 될까요?", expected: "아랫변의 길이" },
        { title: "2. 방정식 세우기", instruction: "사다리꼴 넓이 공식은 $\\frac{1}{2} \\times (윗변 + 아랫변) \\times 높이$ 입니다. 이 공식을 이용하여 방정식(결과=36)을 세워보세요.", expected: "1/2 * (8 + x) * 4 = 36" },
        { title: "3. 방정식 풀기", instruction: "식을 정리하면 $2(8+x)=36$ 이 됩니다. 방정식을 풀어서 아랫변 길이 $x$를 구해보세요.", expected: "x = 10" },
        { title: "4. 확인하기", instruction: "아랫변이 10cm라면 넓이는 $\\frac{1}{2} \\times (8 + 10) \\times 4$ 가 됩니다. 계산 결과가 36이 나오나요? (네/아니요)", expected: "네" }
      ]
    },
    {
      level: '중', title: '일의 양 문제', finalAnswer: "6",
      text: "어떤 일을 완성하는 데 A는 10일이 걸리고, B는 15일이 걸린다고 한다. 이 일을 두 사람이 함께 한다면 며칠 만에 완성할 수 있는지 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "두 사람이 함께 일해서 완성하는 데 걸리는 일수를 미지수 $x$로 두겠습니다. 채팅창에 'x일'이라고 입력해보세요.", expected: "x일 (또는 며칠, 걸리는 일수)" },
        { title: "2. 방정식 세우기", instruction: "전체 일의 양을 1로 두면, A는 하루에 전체의 $\\frac{1}{10}$, B는 $\\frac{1}{15}$을 합니다. 두 사람이 $x$일 동안 일해서 전체 일(1)을 끝낸다는 방정식을 세워보세요.", expected: "x/10 + x/15 = 1" },
        { title: "3. 방정식 풀기", instruction: "양변에 분모 10과 15의 최소공배수인 30을 곱해서 식을 정리하고 $x$값을 구해보세요.", expected: "x = 6" },
        { title: "4. 답 구하기", instruction: "두 사람이 함께 일하면 총 며칠 만에 일을 완성하게 되나요?", expected: "6" }
      ]
    }
  ],
  speed_1: [
    {
      level: '하', title: '왕복 배 타기', finalAnswer: "12",
      text: "유람선을 타고 두 지점 A, B 사이를 왕복하는 데 갈 때는 시속 20km, 올 때는 시속 30km로 운행하여 모두 1시간이 걸렸다. 두 지점 사이의 거리를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하려고 하는 대상인 '두 지점 사이의 거리'를 미지수 $x$로 두겠습니다. 채팅창에 '거리'라고 적어볼까요?", options: ["시간", "속력", "거리"], correctOptionIndex: 2, successMsg: "맞아요! 거리를 $x$ km로 두면 됩니다.", hint: "문제의 맨 끝에서 무엇을 구하라고 했는지 확인해보세요." },
        { title: "2. 방정식 세우기", instruction: "시간은 (거리) ÷ (속력) 입니다. 갈 때 걸린 시간과 올 때 걸린 시간을 합치면 1시간이 된다는 방정식은?", options: ["$20x + 30x = 1$", "$\\frac{x}{20} + \\frac{x}{30} = 1$", "$\\frac{20}{x} + \\frac{30}{x} = 1$"], correctOptionIndex: 1, successMsg: "잘했어요! (갈 때 시간) + (올 때 시간) = 1 의 구조를 완벽하게 세웠습니다.", hint: "갈 때 시간은 $\\frac{x}{20}$, 올 때 시간은 $\\frac{x}{30}$ 이에요." },
        { title: "3-1. 분모 없애기", parentTitle: "3. 방정식 풀기", instruction: "분모 20과 30의 최소공배수인 60을 양변에 곱해봅시다. 올바르게 곱한 식은?", options: ["$3x + 2x = 60$", "$2x + 3x = 60$", "$3x + 2x = 1$"], correctOptionIndex: 0, successMsg: "훌륭합니다! 분수가 사라져서 계산하기 편해졌어요.", hint: "$\\frac{x}{20} \\times 60 = 3x$, $\\frac{x}{30} \\times 60 = 2x$, 그리고 우변 $1 \\times 60 = 60$ 입니다." },
        { title: "3-2. x 구하기", parentTitle: "3. 방정식 풀기", instruction: "$5x = 60$ 을 풀면 $x$는 얼마일까요?", options: ["$x = 10$", "$x = 12$", "$x = 15$"], correctOptionIndex: 1, successMsg: "정확합니다! 거리는 12km가 되네요.", hint: "60을 5로 나누어보세요." },
        { title: "4. 확인하기", instruction: "거리가 12km라면 갈 때는 $12/20$시간(36분), 올 때는 $12/30$시간(24분)이 걸립니다. 합치면 딱 60분(1시간)이 맞나요?", options: ["네, 맞습니다!", "아닙니다."], correctOptionIndex: 0, successMsg: "완벽해요! 왕복 이동 시 속력이 바뀌는 문제를 훌륭하게 풀었습니다.", hint: "36 + 24 를 계산해보세요." }
      ]
    },
    {
      level: '중', title: '도착 시간 비교', finalAnswer: "100",
      text: "A도시에서 B도시까지 가는데 시속 300km인 KTX를 타면 시속 120km인 새마을호를 타는 것보다 30분(1/2시간) 빨리 도착한다고 한다. A, B 두 도시 사이의 거리를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하려고 하는 대상인 '두 도시 사이의 거리'를 미지수 $x$로 두겠습니다. 채팅창에 '거리'라고 적어주세요.", expected: "거리" },
        { title: "2. 방정식 세우기", instruction: "(새마을호 시간) - (KTX 시간) = (시간 차이) 구조입니다. 30분은 $1/2$시간이므로 알맞은 방정식을 세워보세요.", expected: "x/120 - x/300 = 1/2" },
        { title: "3. 방정식 풀기", instruction: "분모 120과 300의 최소공배수인 600을 양변에 곱해서 식을 정리하고 $x$를 구해보세요.", expected: "x = 100" },
        { title: "4. 확인하기", instruction: "거리가 100km라면, 새마을호는 $100/120$시간(50분)이 걸리고 KTX는 $100/300$시간(20분)이 걸립니다. 시간 차이가 30분이 맞나요? (네/아니요)", expected: "네" }
      ]
    },
    {
      level: '중', title: '뛰다가 걷기', finalAnswer: "960",
      text: "다현이는 집에서 2.4km(2400m) 떨어진 도서관에 가는데, 처음에는 분속 240m로 뛰어가다가 중간에는 분속 120m로 걸어갔더니 총 16분이 걸렸다. 다현이가 뛰어간 거리를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "다현이가 뛰어간 거리를 $x$m로 두면, 걸어간 거리는 어떻게 되나요?", expected: "2400-x" },
        { title: "2. 방정식 세우기", instruction: "뛰어갈 때 걸린 시간과 걸어갈 때 걸린 시간을 합치면 16분이라는 방정식을 세워보세요. (거리 ÷ 속력 = 시간)", expected: "x/240 + (2400-x)/120 = 16" },
        { title: "3. 방정식 풀기", instruction: "양변에 분모의 최소공배수인 240을 곱해서 식을 정리하고, 뛰어간 거리 $x$를 구해보세요.", expected: "x = 960" },
        { title: "4. 확인하기", instruction: "뛰어간 거리가 960m라면 4분이 걸리고, 남은 1440m를 걷는 데 12분이 걸립니다. 합하면 16분이 맞나요? (네/아니요)", expected: "네" }
      ]
    }
  ],
  speed_2: [
    {
      level: '하', title: '호수 둘레 돌기', finalAnswer: "20",
      text: "둘레의 길이가 3000m인 호수가 있다. 형은 분속 90m, 동생은 분속 60m로 같은 출발점에서 서로 반대 방향으로 동시에 출발했다. 몇 분 후에 처음으로 만나는지 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하고자 하는 대상인 '만날 때까지 걸린 시간'을 미지수 $x$로 두겠습니다. 채팅창에 '만나는 시간'을 입력해주세요.", options: ["형의 속력", "만나는 시간", "동생의 이동 거리"], correctOptionIndex: 1, successMsg: "맞아요! 걸린 시간 $x$를 구하면 됩니다.", hint: "질문에서 '몇 분 후에' 만나는지 구하라고 했어요." },
        { title: "2. 방정식 세우기", instruction: "서로 반대 방향으로 돌아 만났다면, (형의 이동 거리) + (동생의 이동 거리) = (호수 한 바퀴) 가 됩니다. 방정식은?", options: ["$90x - 60x = 3000$", "$90x + 60x = 3000$", "$90x \\times 60x = 3000$"], correctOptionIndex: 1, successMsg: "아주 잘했어요! 거리의 합이 호수 한 바퀴 길이라는 점이 핵심입니다.", hint: "형의 거리는 $90x$, 동생의 거리는 $60x$ 이며, 이 둘을 더해야 합니다." },
        { title: "3-1. 동류항 계산하기", parentTitle: "3. 방정식 풀기", instruction: "$90x + 60x = 3000$ 좌변을 더하여 정리하면 어떻게 되나요?", options: ["$30x = 3000$", "$150x = 3000$", "$1500x = 3000$"], correctOptionIndex: 1, successMsg: "훌륭합니다! 90과 60을 잘 더했네요.", hint: "90 + 60 을 계산해보세요." },
        { title: "3-2. x 구하기", parentTitle: "3. 방정식 풀기", instruction: "$150x = 3000$ 이므로 양변을 150으로 나누면 $x$는 얼마일까요?", options: ["$x = 10$", "$x = 20$", "$x = 30$"], correctOptionIndex: 1, successMsg: "정확합니다! 20분 후에 만나게 되네요.", hint: "3000을 150으로 나누어보세요. 0을 하나씩 떼고 생각하면 $300 \\div 15$ 입니다." },
        { title: "4. 확인하기", instruction: "20분 동안 형은 1800m를, 동생은 1200m를 이동합니다. 둘의 이동 거리를 합하면 호수 둘레인 3000m가 맞나요?", options: ["네, 맞습니다!", "아닙니다."], correctOptionIndex: 0, successMsg: "완벽해요! 반대로 도는 트랙 문제도 아주 잘 이해했습니다.", hint: "1800 + 1200 을 계산해보세요." }
      ]
    },
    {
      level: '중', title: '마주보고 걷기', finalAnswer: "12",
      text: "종찬이네 집과 찬혁이네 집 사이 거리는 1200m이다. 종찬이는 분속 60m로, 찬혁이는 분속 40m로 각자의 집에서 상대방의 집을 향해 동시에 출발했다. 두 사람은 출발한 지 몇 분 후에 만나는가?",
      steps: [
        { title: "1. 미지수 정하기", instruction: "구하고자 하는 것, 두 사람이 만날 때까지 걸린 시간을 미지수 $x$로 두겠습니다. 단위를 포함해서 무엇이라고 적으면 될까요?", expected: "만날 때까지 걸린 시간 (또는 x분)" },
        { title: "2. 방정식 세우기", instruction: "두 사람이 마주보고 걸어서 만났다면, '(종찬이가 걸은 거리) + (찬혁이가 걸은 거리) = 1200m' 가 됩니다. 거리는 '속력 \\times 시간'을 이용하여 방정식을 세워보세요.", expected: "60x + 40x = 1200" },
        { title: "3. 방정식 풀기", instruction: "세운 방정식을 풀어서 만나는 데 걸린 시간 $x$를 구해보세요.", expected: "x = 12" },
        { title: "4. 확인하기", instruction: "12분 동안 종찬이는 720m, 찬혁이는 480m를 걷습니다. 두 사람이 걸은 거리를 합치면 총 거리인 1200m가 나오나요? (네/아니요)", expected: "네" }
      ]
    },
    {
      level: '상', title: '기차 통과 문제 (속력 비교)', finalAnswer: "120",
      text: "일정한 속력으로 달리는 기차가 240m 길이의 다리를 완전히 통과하는 데 24초가 걸렸고, 180m 길이의 터널을 완전히 통과하는 데 20초가 걸렸다. 이 기차의 길이를 구하시오.",
      steps: [
        { title: "1. 미지수 정하기", instruction: "어려운 심화 문제입니다! 구하려고 하는 '기차의 길이'를 미지수 $x$로 두겠습니다. 채팅창에 '기차의 길이'라고 적으세요.", expected: "기차의 길이" },
        { title: "2. 방정식 세우기", instruction: "기차가 '완전히' 통과하려면 기차 길이까지 더 달려야 합니다. 기차의 속력이 일정하므로 (다리를 통과할 때의 속력) = (터널을 통과할 때의 속력) 이라는 방정식을 세워보세요.", expected: "(x+240)/24 = (x+180)/20" },
        { title: "3. 방정식 풀기", instruction: "양변에 분모 24와 20의 최소공배수인 120을 곱해서 식을 정리하고, $x$를 구해보세요.", expected: "x = 120" },
        { title: "4. 확인하기", instruction: "기차 길이가 120m라면 다리를 통과할 때의 속력은 360/24=15m/s 이고, 터널을 통과할 때의 속력은 300/20=15m/s 로 두 속력이 똑같게 나오나요? (네/아니요)", expected: "네" }
      ]
    }
  ]
};

// --- Gemini API 호출 ---
const callGemini = async (prompt, systemInstruction) => {
  const geminiApiKey = process.env.REACT_APP_GEMINI_KEY || ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  const delay = ms => new Promise(res => setTimeout(res, ms));
  const backoffDelays = [1000, 2000, 4000, 8000, 16000];

  for (let i = 0; i < backoffDelays.length; i++) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "응답을 생성하지 못했어요.";
    } catch (e) {
      if (i === backoffDelays.length - 1) return "네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.";
      await delay(backoffDelays[i]);
    }
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null); 
  const [progress, setProgress] = useState({});
  const [loginError, setLoginError] = useState("");
  
  // --- 대시보드 및 학습 모드 State ---
  const [currentType, setCurrentType] = useState(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // --- 서바이벌 테스트 모드 State ---
  const [isTestMode, setIsTestMode] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [testProblems, setTestProblems] = useState([]);
  const [testCurrentIndex, setTestCurrentIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testResults, setTestResults] = useState([]); 

  const totalAllProblems = Object.values(PROBLEMS).flat().length;

  // --- Firebase 초기 세팅 ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- 학생 진행 데이터 가져오기 ---
  useEffect(() => {
    if (!user || !studentInfo || !db) return;
    const studentId = `${studentInfo.gradeClass}-${studentInfo.studentNum}-${studentInfo.name}`;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'studentProgress', studentId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProgress(docSnap.data().progress || {});
      }
    }, (error) => {
      console.error("진행 상황을 불러오지 못했습니다.", error);
    });
    return () => unsubscribe();
  }, [user, studentInfo]);

  // --- 진행 상황 저장하기 (일반 학습용) ---
  const saveProgress = async (typeId, pIndex) => {
    const newProgress = { ...progress, [`${typeId}-${pIndex}`]: true };
    setProgress(newProgress);
    
    if (user && studentInfo && db) {
      const studentId = `${studentInfo.gradeClass}-${studentInfo.studentNum}-${studentInfo.name}`;
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'studentProgress', studentId);
      try {
        await setDoc(docRef, { progress: newProgress }, { merge: true });
      } catch (err) {
        console.error("진행 상황 저장 실패", err);
      }
    }
  };

  // --- 최고 기록 저장하기 (서바이벌 테스트용) ---
  const updateTestHighScore = async (score) => {
    const currentHighScore = progress.testHighScore || 0;
    if (score > currentHighScore) {
      const newProgress = { ...progress, testHighScore: score };
      setProgress(newProgress);
      if (user && studentInfo && db) {
        const studentId = `${studentInfo.gradeClass}-${studentInfo.studentNum}-${studentInfo.name}`;
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'studentProgress', studentId);
        try {
          await setDoc(docRef, { progress: newProgress }, { merge: true });
        } catch (err) {
          console.error("최고 기록 저장 실패", err);
        }
      }
    }
  };

  // --- MathJax 및 폭죽(Confetti) 라이브러리 세팅 ---
  useEffect(() => {
    if (!window.MathJax) {
      window.MathJax = {
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
        startup: { typeset: false }
      };
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true;
      document.head.appendChild(script);
      script.onload = () => { if (window.MathJax.typesetPromise) window.MathJax.typesetPromise(); };
    }
    
    if (!window.confetti) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise().catch(err => console.log(err));
    }, 50);
    if (!isTestMode) scrollToBottom();
  }, [messages, currentProblemIndex, isTestMode, testCurrentIndex]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const triggerConfetti = () => {
    if (!window.confetti) return;
    var duration = 4000;
    var end = Date.now() + duration;

    (function frame() {
        window.confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'] });
        window.confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'] });
        if (Date.now() < end) { requestAnimationFrame(frame); }
    }());
  };

  const formatText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-blue-800">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const getLevelName = (level, pIdx) => {
    if (level === '하') return '튜토리얼';
    if (level === '중') return `실전 연습 ${pIdx}`;
    if (level === '상') return `도전 문제 ${pIdx + 1}`;
    return level;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const gradeClass = fd.get('gradeClass');
    const studentNum = fd.get('studentNum');
    const name = fd.get('name')?.trim();

    // 선생님테스트 백도어 (선생님테스트, 선생님테스트00 ~ 선생님테스트99)
    const testRegex = /^선생님테스트([0-9]{2})?$/;
    const match = name?.match(testRegex);
    
    if (match) {
      const testNum = match[1] || '0'; // 번호가 없으면 0으로 처리
      setStudentInfo({ 
        gradeClass: '테스트', 
        studentNum: testNum, 
        name: name 
      });
      setLoginError("");
      return;
    }

    if (!gradeClass || !studentNum || !name) {
      setLoginError("반, 번호, 이름을 모두 선택/입력해주세요.");
      return;
    }
    setStudentInfo({ gradeClass, studentNum, name });
    setLoginError("");
  };

  const startGame = (typeId, pIndex) => {
    const problem = PROBLEMS[typeId][pIndex];
    setCurrentType(typeId);
    setCurrentProblemIndex(pIndex);
    setCurrentStep(0);
    setMessages([
      { role: 'bot', text: `안녕하세요! **[${problem.title}]** 문제 풀이를 시작합니다.\n현재 단계: **[${getLevelName(problem.level, pIndex)}]**\n\n상단의 문제를 천천히 읽어보세요.` }
    ]);
    setTimeout(() => postStepInstruction(problem, 0, typeId, pIndex), 1000);
  };

  const goBackToMenu = () => {
    setCurrentType(null);
    setCurrentProblemIndex(null);
  };

  // --- 서바이벌 테스트 로직 ---
  const startTestMode = () => {
    const allProblems = Object.values(PROBLEMS).flat();
    const shuffled = [...allProblems].sort(() => 0.5 - Math.random());
    
    setTestProblems(shuffled);
    setTestCurrentIndex(0);
    setTestScore(0);
    setTestResults([]);
    setIsTestMode(true);
    setIsTestFinished(false);
  };

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    
    setIsLoading(true);
    const current = testProblems[testCurrentIndex];
    const systemPrompt = `당신은 중학교 1학년 일차방정식 자동 채점 시스템입니다.
    문제: ${current.text}
    진짜 정답: ${current.finalAnswer}
    학생이 제출한 답: ${inputText.trim()}
    지시사항: 학생이 제출한 답이 '진짜 정답'과 수치적으로 또는 의미상 완전히 일치하면 오직 "[CORRECT]" 라고만 출력하고, 틀렸거나 다른 수식/말이 섞여 의미가 달라지면 오직 "[INCORRECT]" 라고만 출력하세요. 부연 설명은 절대 금지합니다.`;

    const result = await callGemini(inputText.trim(), systemPrompt);
    const isCorrect = result.includes("[CORRECT]");
    
    setTestResults(prev => [...prev, { problem: current, userAnswer: inputText.trim(), isCorrect }]);

    if (isCorrect) {
      const newScore = testScore + 1;
      setTestScore(newScore);

      if (newScore === testProblems.length) {
        setIsTestFinished(true);
        updateTestHighScore(newScore);
        triggerConfetti();
      } else {
        setTestCurrentIndex(i => i + 1);
        setInputText("");
      }
    } else {
      setIsTestFinished(true);
      updateTestHighScore(testScore);
    }
    
    setIsLoading(false);
  };

  const closeTestMode = () => {
    setIsTestMode(false);
    setIsTestFinished(false);
    setTestProblems([]);
  };

  // --- 기존 학습 모드 로직 ---
  const postStepInstruction = (problem, stepIndex, tId, pIdx) => {
    if (stepIndex >= problem.steps.length) {
      saveProgress(tId, pIdx);
      const isLastProblem = pIdx >= PROBLEMS[tId].length - 1;
      
      if (!isLastProblem) {
        setMessages(prev => [...prev, { role: 'bot', isLevelComplete: true, text: `🎉 **[${getLevelName(problem.level, pIdx)}]** 단계를 완벽하게 끝냈어요!\n왼쪽 패널에서 다음 단계의 문제를 선택해 도전해볼까요?` }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', isLevelComplete: true, text: `🔥 **이 유형의 모든 레벨을 완벽하게 마스터했어요!**\n정말 대단합니다! 왼쪽 위의 [목록으로] 버튼을 눌러 다른 유형도 도전해보세요.` }]);
      }
      return;
    }
    const step = problem.steps[stepIndex];
    setMessages(prev => [...prev, { role: 'bot', text: `**[${step.title}]**\n${step.instruction}`, options: step.options || null, hint: step.hint || null }]);
  };

  const handleHintClick = (hintText) => {
    if (isLoading) return;
    setMessages(prev => [...prev, { role: 'user', text: "선생님, 힌트 주세요!" }]);
    setIsLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: `💡 **힌트:**\n${hintText}` }]);
      setIsLoading(false);
    }, 600);
  };

  const handleOptionClick = (optionText, optionIndex) => {
    if (isLoading) return;
    setMessages(prev => [...prev, { role: 'user', text: optionText }]);
    const problem = PROBLEMS[currentType][currentProblemIndex];
    const step = problem.steps[currentStep];
    setIsLoading(true);
    
    setTimeout(() => {
      if (optionIndex === step.correctOptionIndex) {
        setMessages(prev => [...prev, { role: 'bot', text: step.successMsg }]);
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setTimeout(() => postStepInstruction(problem, nextStep, currentType, currentProblemIndex), 1500);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: "아쉽지만 정답이 아니에요. 문제를 다시 한번 읽고 천천히 생각해보세요!" }]);
      }
      setIsLoading(false);
    }, 800);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    
    const userText = inputText.trim();
    setInputText("");
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    
    const problem = PROBLEMS[currentType][currentProblemIndex];
    const step = problem.steps[currentStep];
    if (step.options) {
      setMessages(prev => [...prev, { role: 'bot', text: "위에 있는 버튼 중에서 정답을 골라주세요!" }]);
      return;
    }

    setIsLoading(true);
    const systemPrompt = `당신은 중학교 1학년 수학을 가르치는 친절한 AI 튜터입니다. 현재 학생은 일차방정식의 활용 문제를 풀고 있습니다.
    [현재 문제] ${problem.text}
    [현재 단계] ${step.title} | 정답 기준: ${step.expected}
    [지시사항]
    1. 학생 대답(${userText})이 수학적으로 맞는지 평가하세요.
    2. 정답이라면, 칭찬의 말과 함께 메시지 맨 마지막 줄에 "[NEXT_STEP]"을 숨겨 포함하세요.
    3. 오답이라면, 정답을 바로 주지 말고 힌트를 주세요. ("[NEXT_STEP]" 포함 금지)
    4. 잡담에는 "우리는 지금 일차방정식을 공부하고 있어요. 문제에 집중해 볼까요?"라고 대답하세요.
    5. 부드러운 존댓말(해요체)을 사용하세요.`;

    const reply = await callGemini(userText, systemPrompt);
    let isCorrect = false;
    let cleanReply = reply;

    if (reply.includes('[NEXT_STEP]')) {
      isCorrect = true;
      cleanReply = reply.replace(/\[NEXT_STEP\]/g, '').trim();
    }

    setMessages(prev => [...prev, { role: 'bot', text: cleanReply }]);
    
    if (isCorrect) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setTimeout(() => postStepInstruction(problem, nextStep, currentType, currentProblemIndex), 2000);
    }
    setIsLoading(false);
  };

  const renderStepper = () => {
    const problem = PROBLEMS[currentType][currentProblemIndex];
    const displayItems = [];
    let lastRenderedParent = null;

    problem.steps.forEach((step, idx) => {
      let statusClass = "text-gray-400";
      let circleClass = "bg-gray-200 text-gray-500";
      if (idx < currentStep) { statusClass = "text-green-600 font-medium"; circleClass = "bg-green-500 text-white"; } 
      else if (idx === currentStep) { statusClass = "text-blue-600 font-bold"; circleClass = "bg-blue-500 text-white ring-4 ring-blue-100"; }

      const match = step.title.match(/^(\d+(-\d+)?)/);
      const stepNum = match ? match[0] : (idx + 1);
      const stepTitleText = step.title.replace(/^(\d+(-\d+)?)\.\s*/, '');
      const isSubStep = stepNum.toString().includes('-');

      if (step.parentTitle && step.parentTitle !== lastRenderedParent) {
        const parentMatch = step.parentTitle.match(/^(\d+)/);
        const pNum = parentMatch ? parentMatch[1] : "";
        const pTitleText = step.parentTitle.replace(/^(\d+)\.\s*/, '');
        const childrenIdxs = problem.steps.map((s, i) => s.parentTitle === step.parentTitle ? i : -1).filter(i => i !== -1);
        const firstChild = childrenIdxs[0];
        const lastChild = childrenIdxs[childrenIdxs.length - 1];

        let pStatusClass = "text-gray-400"; let pCircleClass = "bg-gray-200 text-gray-500"; let pCheckMark = pNum;
        if (currentStep > lastChild) { pStatusClass = "text-green-600 font-medium"; pCircleClass = "bg-green-500 text-white"; pCheckMark = "✓"; } 
        else if (currentStep >= firstChild && currentStep <= lastChild) { pStatusClass = "text-blue-600 font-bold"; pCircleClass = "bg-blue-500 text-white ring-4 ring-blue-100"; }

        displayItems.push(
          <div key={`parent-${pNum}`} className={`flex items-center space-x-3 ${pStatusClass} mt-3`}>
            <div className={`rounded-full flex items-center justify-center font-bold shrink-0 w-8 h-8 text-sm ${pCircleClass}`}>{pCheckMark}</div>
            <span>{pTitleText}</span>
          </div>
        );
        lastRenderedParent = step.parentTitle;
      }

      displayItems.push(
        <div key={`step-${idx}`} className={`flex items-center space-x-3 ${statusClass} ${isSubStep ? 'ml-7 mt-1.5' : 'mt-3'}`}>
          <div className={`rounded-full flex items-center justify-center font-bold shrink-0 ${circleClass} ${isSubStep ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}`}>{idx < currentStep ? "✓" : stepNum}</div>
          <span className={isSubStep ? 'text-[13px]' : 'text-sm'}>{stepTitleText}</span>
        </div>
      );
    });

    return (
      <div className="flex flex-col mt-6 bg-slate-50 p-5 rounded-2xl shadow-inner border border-slate-100">
        <h3 className="font-bold text-gray-700 mb-2 flex items-center"><span className="mr-2">📍</span> 현재 진행 단계</h3>
        {displayItems}
      </div>
    );
  };

  // --- 화면 1: 로그인 ---
  if (!studentInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="text-6xl mb-6">🎒</div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">일차방정식 튜터</h1>
          <p className="text-gray-500 mb-8">학습 진행 상황 저장을 위해 정보를 입력해주세요!</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex space-x-4">
              <select name="gradeClass" defaultValue="" className="w-1/2 bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-gray-700 cursor-pointer">
                <option value="" disabled>반 선택</option>
                {[1, 2, 3, 4].map(num => (<option key={num} value={num}>{num}반</option>))}
              </select>
              <select name="studentNum" defaultValue="" className="w-1/2 bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-gray-700 cursor-pointer">
                <option value="" disabled>번호 선택</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (<option key={num} value={num}>{num}번</option>))}
              </select>
            </div>
            <input name="name" placeholder="이름 (예: 홍길동, 선생님테스트00)" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none text-gray-700" />
            {loginError && <p className="text-red-500 text-sm font-bold text-left px-2">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg p-4 rounded-xl transition shadow-md mt-4">
              학습 시작하기 🚀
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 화면 4: 서바이벌 테스트 모드 ---
  if (isTestMode) {
    if (isTestFinished) {
      const isMastered = testScore === testProblems.length;
      const lastResult = testResults[testResults.length - 1]; 

      return (
        <div className="min-h-screen bg-gray-100 font-sans p-6 md:p-10 flex flex-col items-center py-12">
          <div className="bg-white max-w-3xl w-full rounded-3xl shadow-xl p-8 md:p-12 border-t-8 border-blue-600">
            <div className="text-center mb-10">
              <div className="text-7xl mb-4">{isMastered ? '🎉' : '💥'}</div>
              <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
                {isMastered ? '일차방정식 서바이벌 마스터!' : '앗! 오답입니다. 도전 종료!'}
              </h1>
              <p className="text-gray-500 text-lg">
                총 {testProblems.length}문제 중 <span className="text-blue-600 font-bold">{testScore}문제</span> 연속 정답
              </p>
            </div>
            
            {!isMastered && lastResult && (
              <div className="mb-10 p-6 rounded-2xl bg-red-50 border border-red-200 shadow-sm">
                <h3 className="font-bold text-red-800 mb-4 flex items-center"><span className="text-xl mr-2">💡</span>틀린 문제 다시보기</h3>
                <p className="text-gray-800 font-medium mb-4 leading-relaxed">{lastResult.problem.text}</p>
                <div className="text-sm bg-white p-4 rounded-xl border border-gray-200">
                  <p className="mb-2"><span className="text-gray-500 mr-2">나의 답:</span> <span className="font-bold text-red-600">{lastResult.userAnswer}</span></p>
                  <p><span className="text-gray-500 mr-2">정답:</span> <span className="font-bold text-blue-600">{lastResult.problem.finalAnswer}</span></p>
                </div>
              </div>
            )}

            <button onClick={closeTestMode} className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold text-lg p-5 rounded-2xl transition shadow-md">
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    const currentTestProblem = testProblems[testCurrentIndex];
    return (
      <div className="min-h-screen bg-slate-900 font-sans p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl mb-4 flex justify-between items-center text-white px-2">
          <h2 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            🔥 SURVIVAL MODE
          </h2>
          <div className="text-right">
            <p className="text-sm text-gray-400 font-bold">현재 연속 정답</p>
            <p className="text-3xl font-black text-emerald-400">{testScore}</p>
          </div>
        </div>

        <div className="bg-white max-w-3xl w-full rounded-3xl shadow-2xl overflow-hidden ring-4 ring-white/10">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white flex justify-between items-center">
            <span className="font-bold text-blue-100 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              틀리는 순간 즉시 종료됩니다!
            </span>
            <span className="bg-black/20 px-4 py-1.5 rounded-full font-bold text-sm tracking-wide">
              {testCurrentIndex + 1} / {testProblems.length}
            </span>
          </div>
          
          <div className="p-8 md:p-10">
            <p className="text-gray-800 text-xl font-bold leading-relaxed break-keep mb-10">
              {currentTestProblem.text}
            </p>

            <form onSubmit={handleTestSubmit} className="space-y-4">
              <label className="block text-gray-500 text-sm font-bold mb-2">정답 입력 (숫자 또는 단위 포함)</label>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="예: 5000원, 3명, 10 등"
                disabled={isLoading}
                className="w-full bg-gray-50 border-2 border-gray-200 px-6 py-5 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50 text-gray-800 text-lg transition font-bold"
              />
              
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold text-xl p-5 rounded-2xl transition shadow-lg flex justify-center items-center mt-2"
              >
                {isLoading ? (
                   <span className="flex space-x-2">
                     <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"></span>
                     <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                     <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                   </span>
                ) : '제출하기'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- 화면 2: 대시보드 ---
  if (!currentType) {
    const testHighScore = progress.testHighScore || 0;
    const isTestMastered = testHighScore === totalAllProblems;

    return (
      <div className="min-h-screen bg-gray-100 font-sans p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8 border-b border-gray-300 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">일차방정식 튜터 대시보드</h1>
              <p className="text-lg text-gray-600 mt-2">
                환영합니다, <span className="font-bold text-blue-600">
                  {studentInfo.gradeClass === '테스트' 
                    ? `${studentInfo.name}` 
                    : `${studentInfo.gradeClass}반 ${studentInfo.studentNum}번 ${studentInfo.name}`}
                </span> 님!
              </p>
            </div>
            <button onClick={() => setStudentInfo(null)} className="text-sm text-gray-500 hover:text-gray-800 underline">정보 수정</button>
          </div>

          <h2 className="text-2xl font-bold text-gray-700 mb-6">📚 6대 핵심 유형 마스터하기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {PROBLEM_TYPES.map(type => {
              const totalPractice = PROBLEMS[type.id].length - 1;
              const tutorialDone = !!progress[`${type.id}-0`];
              const practiceDoneCount = PROBLEMS[type.id].reduce((acc, _, idx) => {
                if (idx > 0 && progress[`${type.id}-${idx}`]) return acc + 1;
                return acc;
              }, 0);
              const isFullyDone = tutorialDone && (practiceDoneCount === totalPractice);

              return (
                <div key={type.id} onClick={() => startGame(type.id, 0)} className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition border border-gray-200 cursor-pointer group relative overflow-hidden flex flex-col h-full">
                  {isFullyDone && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl z-10">마스터 완료!</div>
                  )}
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="text-4xl bg-blue-50 p-3 rounded-2xl group-hover:bg-blue-100 transition shrink-0">{type.icon}</span>
                    <h3 className="text-xl font-bold text-gray-800 break-keep leading-snug">{type.name}</h3>
                  </div>
                  <p className="text-[14px] text-gray-500 mb-6 flex-1 break-keep leading-relaxed">{type.desc}</p>
                  
                  <div className="space-y-4 mt-auto shrink-0 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-gray-600">튜토리얼</span>
                      <span className={tutorialDone ? "text-green-600 font-bold" : "text-gray-400"}>{tutorialDone ? '완료 ✅' : '미완료 ❌'}</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-sm font-medium mb-2">
                        <span className="text-gray-600">실전 연습</span>
                        <span className="text-blue-600 font-bold">{practiceDoneCount} / {totalPractice}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(practiceDoneCount / totalPractice) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`rounded-3xl shadow-xl p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between transition-colors duration-700 
            ${isTestMastered ? 'bg-gradient-to-r from-yellow-500 to-orange-500 ring-4 ring-yellow-300' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}>
            <div className="mb-6 md:mb-0 md:pr-8 w-full md:w-auto">
              <div className="flex items-center mb-3">
                <span className="mr-3 text-4xl">{isTestMastered ? '👑' : '🔥'}</span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {isTestMastered ? '서바이벌 마스터 칭호 획득!' : '서바이벌 실력 점검'}
                </h2>
              </div>
              <p className={`text-lg break-keep ${isTestMastered ? 'text-yellow-100' : 'text-gray-400'}`}>
                {isTestMastered 
                  ? "일차방정식의 활용 모든 유형을 완벽하게 마스터했습니다. 대단합니다!" 
                  : `전체 ${totalAllProblems}문제가 랜덤 출제됩니다. 단 한 문제라도 틀리면 즉시 종료됩니다.`}
              </p>
              
              <div className="mt-5 flex items-center space-x-3">
                <span className={`text-sm font-bold px-3 py-1 rounded-md ${isTestMastered ? 'bg-white/20' : 'bg-white/10'}`}>내 최고 기록</span>
                <span className="text-2xl font-black">{testHighScore} <span className="text-lg opacity-70">/ {totalAllProblems}</span></span>
              </div>
            </div>
            
            <button 
              onClick={startTestMode}
              className={`w-full md:w-auto shrink-0 font-black text-xl py-5 px-10 rounded-2xl shadow-xl transition transform hover:-translate-y-1 
                ${isTestMastered ? 'bg-white text-orange-600 hover:bg-orange-50' : 'bg-blue-600 text-white hover:bg-blue-500 border border-blue-500'}`}
            >
              {isTestMastered ? '다시 도전하기' : '테스트 시작하기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 화면 3: 개별 문제 학습 ---
  const typeProblems = PROBLEMS[currentType];
  const problem = typeProblems[currentProblemIndex];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans">
      <div className="w-full md:w-[280px] lg:w-[320px] bg-white border-r border-gray-200 flex flex-col shadow-lg z-20 h-full">
        <div className="p-6 border-b border-gray-100 shrink-0">
          <button onClick={goBackToMenu} className="flex items-center text-sm font-bold text-gray-500 hover:text-blue-600 transition mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            대시보드로 돌아가기
          </button>
          <h2 className="text-xl font-extrabold text-gray-800 break-keep">{PROBLEM_TYPES.find(t=>t.id===currentType)?.name}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <div className="space-y-2 shrink-0 mb-6">
            {typeProblems.map((p, idx) => {
              const isSelected = idx === currentProblemIndex;
              const isCompleted = !!progress[`${currentType}-${idx}`];
              const name = getLevelName(p.level, idx);
              let badgeColor = p.level === '하' ? "bg-green-100 text-green-700" : (p.level === '중' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700");

              return (
                <button key={idx} onClick={() => startGame(currentType, idx)} className={`w-full text-left p-4 rounded-xl transition flex flex-col justify-center border ${isSelected ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-center w-full mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>{name}</span>
                    {isCompleted && <span className="text-green-500 font-bold">✅</span>}
                  </div>
                  <span className={`font-bold truncate w-full ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{p.title}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto">{renderStepper()}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative h-full bg-slate-50">
        <div className="bg-white p-6 md:p-8 border-b border-gray-200 shadow-sm z-10 shrink-0">
          <div className="max-w-4xl mx-auto flex items-start space-x-4">
            <div className="text-3xl pt-1">📝</div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{problem.title}</h2>
              <div className="text-gray-700 text-lg leading-relaxed break-keep">{problem.text}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, index) => (
              <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] md:max-w-[75%] p-5 rounded-2xl shadow-sm text-[15px] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-md'}`}>
                  {msg.role === 'bot' && (
                    <div className="flex items-center space-x-2 mb-3 text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                      <span className="font-extrabold text-sm tracking-wide">AI 튜터</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed font-medium">{formatText(msg.text)}</div>
                </div>

                {msg.options && (
                  <div className="mt-4 flex flex-col space-y-3 w-full max-w-[90%] md:max-w-[75%] pl-2">
                    {msg.options.map((opt, oIdx) => (
                      <button key={oIdx} onClick={() => handleOptionClick(opt, oIdx)} disabled={isLoading || currentStep >= problem.steps.length} className="text-left bg-white border-2 border-blue-100 hover:border-blue-400 hover:bg-blue-50 text-blue-800 py-3 px-5 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed font-bold text-[15px]">{opt}</button>
                    ))}
                    {msg.hint && (
                      <button onClick={() => handleHintClick(msg.hint)} disabled={isLoading || currentStep >= problem.steps.length} className="text-left bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-yellow-800 py-2.5 px-4 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center font-bold mt-2 w-fit">💡 힌트 보기</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-5 rounded-2xl rounded-bl-none border border-gray-200 shadow-md flex items-center space-x-2 text-gray-500">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-white p-4 border-t border-gray-200 shadow-lg z-10 shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={problem.level === '하' ? "위에 있는 버튼을 선택해주세요." : (currentStep < problem.steps.length ? "자유롭게 수식이나 생각을 입력해주세요..." : "이 문제의 모든 단계를 완료했습니다.")} disabled={isLoading || (problem.level === '하' && currentStep < problem.steps.length) || currentStep >= problem.steps.length} className="w-full bg-gray-50 border border-gray-300 px-6 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-gray-800 text-lg shadow-inner" />
            <button type="submit" disabled={isLoading || !inputText.trim() || (problem.level === '하') || currentStep >= problem.steps.length} className="absolute right-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full transition shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}