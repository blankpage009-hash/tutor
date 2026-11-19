// 앱 주소가 /tutor/ 아래라서 BASE_URL을 앞에 붙인다 (개발 서버와 배포본 모두 같은 규칙)
export function contentUrl(relPath: string): string {
  return `${import.meta.env.BASE_URL}content/${relPath}`;
}
