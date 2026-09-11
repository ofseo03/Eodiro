// spec.md 부록 A(서울 전역 동네 목록)를 읽어 config/regions.json 을 생성한다.
//   node scripts/gen-regions.mjs
//
// - id: ASCII 슬러그. 우선 검수 지역 5곳은 기존 id(seongsu·tongui·ikseon·hongdae·yeonnam)를 그대로 쓴다.
// - lat/lng: 동네 대표 좌표. `npm run collect:regions`(공식 행정동 경계 → 면적 중심)가 채운 값은
//   centerSource "official" 로 표시되며 이 스크립트가 보존한다. 아직 공식 값이 없는 동네는
//   아래 APPROX 표의 근사 좌표를 넣고 centerSource "approximate" 로 표시한다.
//   근사 좌표는 기상청 5km 예보 격자를 고르는 용도로만 쓰이고, 장소의 동네 판정에는 쓰지 않는다
//   (장소 판정은 config/region-boundaries.json 의 공식 경계로만 한다).
// - priority: 사람이 장소 데이터를 검수하는 우선 검수 지역(spec 1장).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const specPath = new URL("../spec.md", import.meta.url);
const outPath = new URL("../config/regions.json", import.meta.url);

/** 동네 표시명 → [id, 근사 lat, 근사 lng]. 우선 검수 지역은 id만 쓰고 좌표는 공식 값을 유지한다. */
const APPROX = {
  // 종로구
  "서촌(통의)": ["tongui", 37.5812, 126.9700],
  "북촌·삼청": ["bukchon-samcheong", 37.5826, 126.9830],
  "익선·인사동": ["ikseon", 37.5753, 126.9899],
  "동대문시장·종로5가": ["jongno5ga", 37.5705, 127.0060],
  "대학로·혜화": ["daehangno-hyehwa", 37.5826, 127.0015],
  "부암·평창": ["buam-pyeongchang", 37.6050, 126.9680],
  "독립문·교남": ["dongnimmun-gyonam", 37.5720, 126.9620],
  "창신·숭인": ["changsin-sungin", 37.5760, 127.0140],
  // 중구
  "명동·소공": ["myeongdong-sogong", 37.5636, 126.9840],
  "남대문·회현": ["namdaemun-hoehyeon", 37.5580, 126.9780],
  "을지로": ["euljiro", 37.5660, 126.9910],
  "충무로·필동": ["chungmuro-pildong", 37.5610, 126.9950],
  "장충·DDP": ["jangchung-ddp", 37.5630, 127.0060],
  "신당·황학": ["sindang-hwanghak", 37.5650, 127.0180],
  "약수·청구": ["yaksu-cheonggu", 37.5545, 127.0120],
  "서울역·중림": ["seoul-station-jungnim", 37.5580, 126.9660],
  // 용산구
  "이태원·경리단길": ["itaewon-gyeongnidan", 37.5340, 126.9950],
  "한남": ["hannam", 37.5360, 127.0040],
  "해방촌·후암": ["haebangchon-huam", 37.5480, 126.9820],
  "용리단길·삼각지": ["yongnidan-samgakji", 37.5320, 126.9680],
  "남영·숙대입구": ["namyeong-sookmyung", 37.5440, 126.9700],
  "효창·원효로": ["hyochang-wonhyoro", 37.5390, 126.9600],
  "이촌": ["ichon", 37.5220, 126.9700],
  "서빙고·보광": ["seobinggo-bogwang", 37.5260, 127.0000],
  // 성동구
  "성수·서울숲": ["seongsu", 37.5423, 127.0489],
  "왕십리·행당": ["wangsimni-haengdang", 37.5620, 127.0330],
  "마장·사근": ["majang-sageun", 37.5680, 127.0430],
  "금호·옥수": ["geumho-oksu", 37.5470, 127.0200],
  "응봉": ["eungbong", 37.5520, 127.0330],
  "송정·용답": ["songjeong-yongdap", 37.5630, 127.0560],
  // 광진구
  "건대입구": ["konkuk", 37.5400, 127.0700],
  "어린이대공원·군자": ["childrens-grand-park-gunja", 37.5500, 127.0800],
  "중곡": ["junggok", 37.5620, 127.0850],
  "구의": ["guui", 37.5410, 127.0880],
  "광장": ["gwangjang", 37.5450, 127.1040],
  "자양": ["jayang", 37.5320, 127.0800],
  // 동대문구
  "청량리·제기": ["cheongnyangni-jegi", 37.5810, 127.0400],
  "회기·휘경": ["hoegi-hwigyeong", 37.5900, 127.0570],
  "이문": ["imun", 37.5990, 127.0620],
  "전농·답십리": ["jeonnong-dapsimni", 37.5760, 127.0560],
  "장안": ["jangan", 37.5720, 127.0700],
  // 중랑구
  "면목": ["myeonmok", 37.5860, 127.0870],
  "상봉·망우": ["sangbong-mangu", 37.5960, 127.0950],
  "중화": ["junghwa", 37.6010, 127.0790],
  "먹골·묵동": ["meokgol-mukdong", 37.6130, 127.0780],
  "신내": ["sinnae", 37.6110, 127.1020],
  // 성북구
  "성북동": ["seongbukdong", 37.5930, 126.9950],
  "성신여대·돈암": ["sungshin-donam", 37.5920, 127.0170],
  "안암·보문": ["anam-bomun", 37.5860, 127.0270],
  "정릉": ["jeongneung", 37.6080, 127.0080],
  "길음": ["gireum", 37.6060, 127.0230],
  "종암·월곡": ["jongam-wolgok", 37.6030, 127.0380],
  "장위·석관": ["jangwi-seokgwan", 37.6120, 127.0520],
  // 강북구
  "미아·삼양": ["mia-samyang", 37.6200, 127.0230],
  "번동": ["beondong", 37.6350, 127.0350],
  "수유": ["suyu", 37.6380, 127.0180],
  "우이·인수": ["ui-insu", 37.6560, 127.0140],
  // 도봉구
  "쌍문": ["ssangmun", 37.6500, 127.0320],
  "방학": ["banghak", 37.6650, 127.0330],
  "창동": ["changdong", 37.6530, 127.0470],
  "도봉": ["dobong", 37.6800, 127.0440],
  // 노원구
  "노원역": ["nowon-station", 37.6560, 127.0640],
  "상계·수락산": ["sanggye-suraksan", 37.6720, 127.0670],
  "중계": ["junggye", 37.6440, 127.0770],
  "하계": ["hagye", 37.6370, 127.0700],
  "공릉·태릉": ["gongneung-taereung", 37.6250, 127.0780],
  "월계": ["wolgye", 37.6260, 127.0570],
  // 은평구
  "연신내·불광": ["yeonsinnae-bulgwang", 37.6180, 126.9210],
  "녹번·응암": ["nokbeon-eungam", 37.6000, 126.9220],
  "구산·역촌": ["gusan-yeokchon", 37.6100, 126.9100],
  "신사(은평)": ["sinsa-eunpyeong", 37.5940, 126.9110],
  "수색·증산": ["susaek-jeungsan", 37.5820, 126.9010],
  "은평뉴타운·진관": ["eunpyeong-newtown-jingwan", 37.6380, 126.9200],
  // 서대문구
  "신촌·이대": ["sinchon-edae", 37.5580, 126.9400],
  "연희": ["yeonhui", 37.5690, 126.9300],
  "충정로·북아현": ["chungjeongno-bugahyeon", 37.5610, 126.9560],
  "홍제": ["hongje", 37.5890, 126.9450],
  "홍은": ["hongeun", 37.5960, 126.9370],
  "가좌": ["gajwa", 37.5750, 126.9130],
  // 마포구
  "홍대": ["hongdae", 37.5548, 126.9210],
  "연남": ["yeonnam", 37.5630, 126.9214],
  "합정·상수": ["hapjeong-sangsu", 37.5480, 126.9170],
  "망원": ["mangwon", 37.5560, 126.9040],
  "공덕·마포": ["gongdeok-mapo", 37.5440, 126.9510],
  "아현·대흥": ["ahyeon-daeheung", 37.5530, 126.9520],
  "성산": ["seongsan", 37.5670, 126.9080],
  "상암": ["sangam", 37.5780, 126.8900],
  // 양천구
  "목동": ["mokdong", 37.5330, 126.8740],
  "신정": ["sinjeong", 37.5200, 126.8560],
  "신월": ["sinwol", 37.5330, 126.8330],
  // 강서구
  "염창·등촌": ["yeomchang-deungchon", 37.5530, 126.8660],
  "화곡": ["hwagok", 37.5410, 126.8400],
  "가양": ["gayang", 37.5620, 126.8500],
  "마곡·발산": ["magok-balsan", 37.5580, 126.8300],
  "공항·방화": ["gonghang-banghwa", 37.5700, 126.8060],
  // 구로구
  "신도림": ["sindorim", 37.5080, 126.8830],
  "구로디지털·구로": ["guro-digital-guro", 37.4880, 126.8880],
  "고척": ["gocheok", 37.5000, 126.8600],
  "개봉": ["gaebong", 37.4900, 126.8560],
  "오류·항동": ["oryu-hangdong", 37.4880, 126.8380],
  // 금천구
  "가산디지털": ["gasan-digital", 37.4800, 126.8830],
  "독산": ["doksan", 37.4670, 126.8980],
  "시흥(금천)": ["siheung-geumcheon", 37.4500, 126.9040],
  // 영등포구
  "여의도": ["yeouido", 37.5220, 126.9240],
  "영등포역·타임스퀘어": ["yeongdeungpo-station-timessquare", 37.5160, 126.9070],
  "문래·도림": ["mullae-dorim", 37.5150, 126.8940],
  "당산·양평": ["dangsan-yangpyeong", 37.5300, 126.9010],
  "신길": ["singil", 37.5090, 126.9150],
  "대림": ["daerim", 37.4950, 126.9010],
  // 동작구
  "노량진": ["noryangjin", 37.5130, 126.9420],
  "상도·숭실대": ["sangdo-soongsil", 37.4990, 126.9480],
  "흑석·중앙대": ["heukseok-cau", 37.5060, 126.9630],
  "사당·이수": ["sadang-isu", 37.4820, 126.9760],
  "보라매·대방": ["boramae-daebang", 37.4970, 126.9250],
  // 관악구
  "서울대입구·샤로수길": ["snu-station-sharosugil", 37.4800, 126.9530],
  "낙성대·남현": ["nakseongdae-namhyeon", 37.4740, 126.9670],
  "신림역": ["sillim-station", 37.4840, 126.9290],
  "대학동·난곡": ["daehakdong-nangok", 37.4680, 126.9250],
  "보라매(관악)": ["boramae-gwanak", 37.4900, 126.9340],
  // 서초구
  "강남역(서초)·교대": ["gangnam-station-seocho-gyodae", 37.4930, 127.0210],
  "반포·잠원·서래마을": ["banpo-jamwon-seorae", 37.5070, 127.0090],
  "방배": ["bangbae", 37.4850, 126.9900],
  "양재·내곡": ["yangjae-naegok", 37.4680, 127.0400],
  // 강남구
  "가로수길·신사": ["garosugil-sinsa", 37.5220, 127.0230],
  "압구정": ["apgujeong", 37.5270, 127.0330],
  "청담": ["cheongdam", 37.5230, 127.0480],
  "논현": ["nonhyeon", 37.5110, 127.0300],
  "강남역(역삼)·역삼": ["gangnam-station-yeoksam", 37.4990, 127.0350],
  "삼성·코엑스": ["samseong-coex", 37.5110, 127.0580],
  "대치": ["daechi", 37.4960, 127.0600],
  "도곡": ["dogok", 37.4890, 127.0470],
  "개포": ["gaepo", 37.4820, 127.0620],
  "일원·수서": ["irwon-suseo", 37.4880, 127.0850],
  "세곡": ["segok", 37.4660, 127.1040],
  // 송파구
  "잠실": ["jamsil", 37.5110, 127.0860],
  "송리단길·석촌": ["songnidan-seokchon", 37.5030, 127.1050],
  "방이·올림픽공원": ["bangi-olympic-park", 37.5150, 127.1170],
  "풍납": ["pungnap", 37.5330, 127.1140],
  "가락·문정": ["garak-munjeong", 37.4900, 127.1180],
  "오금·거여·마천": ["ogeum-geoyeo-macheon", 37.4950, 127.1430],
  "장지·위례": ["jangji-wirye", 37.4770, 127.1350],
  // 강동구
  "천호": ["cheonho", 37.5390, 127.1250],
  "성내": ["seongnae", 37.5310, 127.1300],
  "길동·둔촌": ["gildong-dunchon", 37.5330, 127.1470],
  "암사": ["amsa", 37.5520, 127.1320],
  "명일·고덕": ["myeongil-godeok", 37.5550, 127.1530],
  "상일·강일": ["sangil-gangil", 37.5580, 127.1720],
};

const PRIORITY = new Set(["seongsu", "tongui", "ikseon", "hongdae", "yeonnam"]);

const spec = readFileSync(specPath, "utf8");
const body = spec.slice(spec.indexOf("## 부록 A."));
const previous = existsSync(outPath) ? new Map(JSON.parse(readFileSync(outPath, "utf8")).map((r) => [r.id, r])) : new Map();

const regions = [];
let district = null;
for (const line of body.split("\n")) {
  const h = line.match(/^### (.+?)\s*$/);
  if (h) { district = h[1].trim(); continue; }
  const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/);
  if (!row || !district || row[1] === "동네" || /^-+$/.test(row[1])) continue;
  const name = row[1];
  // '종로1·2·3·4가동'처럼 행정동 이름에 ·가 있을 수 있다. 실제 행정동명은 한글로 시작하므로 숫자 앞의 ·는 나누지 않는다.
  const dongs = row[2].split(/·(?=\D)/).map((s) => s.trim()).filter(Boolean);
  const entry = APPROX[name];
  if (!entry) throw new Error(`좌표 표에 없는 동네: ${name}`);
  const [id, lat, lng] = entry;
  const old = previous.get(id);
  const official = old && old.centerSource === "official" && Number.isFinite(old.lat) && Number.isFinite(old.lng);
  regions.push({
    id, name, district, dongs,
    lat: official ? old.lat : lat,
    lng: official ? old.lng : lng,
    centerSource: official ? "official" : "approximate",
    priority: PRIORITY.has(id),
  });
}

const ids = new Set(regions.map((r) => r.id));
if (ids.size !== regions.length) throw new Error("동네 id 중복");
writeFileSync(outPath, "[\n" + regions.map((r) => "  " + JSON.stringify(r)).join(",\n") + "\n]\n");
const districts = new Set(regions.map((r) => r.district)).size;
const dongs = regions.reduce((n, r) => n + r.dongs.length, 0);
const official = regions.filter((r) => r.centerSource === "official").length;
console.log(`config/regions.json: 자치구 ${districts} · 동네 ${regions.length} · 행정동 ${dongs} · 공식 좌표 ${official}`);
