
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib import rc

# 한글 폰트 설정 (Windows 환경 가정)
try:
    rc('font', family='Malgun Gothic')
except:
    print("Malgun Gothic font not found, using default.")

def create_architecture_diagram():
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')

    # 스타일 정의
    box_props = dict(boxstyle='round,pad=0.5', facecolor='#E6F3FF', edgecolor='#0066CC', linewidth=2)
    ai_props = dict(boxstyle='round,pad=0.5', facecolor='#F0E6FF', edgecolor='#6600CC', linewidth=2)
    db_props = dict(boxstyle='round,pad=0.5', facecolor='#E6FFE6', edgecolor='#006600', linewidth=2)
    user_props = dict(boxstyle='circle,pad=0.3', facecolor='#FFF0E6', edgecolor='#CC6600', linewidth=2)

    # 노드 그리기 함수
    def draw_box(x, y, text, props, width=2.5, height=1.5):
        rect = patches.FancyBboxPatch((x, y), width, height, **props)
        # ax.add_patch(rect) # patches are hard to center text with, using text bbox instead
        ax.text(x + width/2, y + height/2, text, ha='center', va='center', size=12, fontweight='bold', bbox=props)
        return x + width/2, y + height/2, x, y, width, height # center x, center y, left, bottom, w, h
    
    # 노드 배치
    # 사용자
    cx_user, cy_user, _, _, _, _ = draw_box(0.5, 3.5, "사용자\n(User)", user_props, 1.5, 1.5)
    
    # 프론트엔드
    cx_fe, cy_fe, _, _, _, _ = draw_box(3.0, 3.5, "프론트엔드\n(Next.js)\n- 학습 인터페이스\n- 대시보드", box_props, 2.8, 1.8)
    
    # 백엔드
    cx_be, cy_be, _, _, _, _ = draw_box(6.5, 3.5, "백엔드 서버\n(FastAPI)\n- API 처리\n- 비즈니스 로직", box_props, 2.8, 1.8)
    
    # AI 엔진
    cx_ai, cy_ai, _, _, _, _ = draw_box(6.5, 6.0, "AI 엔진\n(OpenAI GPT)\n- 문제 생성\n- 오답 분석\n- 개인화 튜터", ai_props, 2.8, 1.5)
    
    # 데이터베이스
    cx_db, cy_db, _, _, _, _ = draw_box(6.5, 1.0, "데이터베이스\n(SQLite)\n- 사용자 데이터\n- 커리큘럼\n- 학습 기록", db_props, 2.8, 1.5)

    # 화살표 그리기 함수
    def draw_arrow(x1, y1, x2, y2, label=""):
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", lw=2, color='gray'))
        if label:
            mid_x = (x1 + x2) / 2
            mid_y = (x1 + y2) / 2 # Simple text placement depending on direction
            if y1 == y2: # Horizontal
                 ax.text(mid_x, y1 + 0.1, label, ha='center', va='bottom', fontsize=9, color='black')
            else:
                 ax.text(mid_x, (y1+y2)/2, label, ha='right', va='center', fontsize=9, color='black', alpha=0.8)

    # 연결선 (Edges)
    
    # User <-> Frontend
    draw_arrow(cx_user + 0.75, cy_user, cx_fe - 1.4, cy_fe, "접속 및 상호작용")
    draw_arrow(cx_fe - 1.4, cy_fe-0.2, cx_user + 0.75, cy_be-0.2, "") # Return path visual

    # Frontend <-> Backend
    draw_arrow(cx_fe + 1.4, cy_fe, cx_be - 1.4, cy_be, "API 요청 (JSON)")
    draw_arrow(cx_be - 1.4, cy_be - 0.2, cx_fe + 1.4, cy_fe - 0.2, "데이터 응답")

    # Backend <-> AI
    draw_arrow(cx_be, cy_be + 0.9, cx_ai, cy_ai - 0.75, "프롬프트 전송")
    draw_arrow(cx_ai + 0.1, cy_ai - 0.75, cx_be + 0.1, cy_be + 0.9, "생성 결과 반환")

    # Backend <-> DB
    draw_arrow(cx_be, cy_be - 0.9, cx_db, cy_db + 0.75, "쿼리 실행")
    draw_arrow(cx_db + 0.1, cy_db + 0.75, cx_be + 0.1, cy_be - 0.9, "데이터 반환")

    plt.title("시스템 아키텍처 다이어그램 (System Architecture)", fontsize=16, pad=20, fontweight='bold')
    plt.tight_layout()
    plt.savefig('system_architecture.png', dpi=300, bbox_inches='tight')
    print("Diagram saved to system_architecture.png")

if __name__ == "__main__":
    create_architecture_diagram()
