
export enum Platform {
  PC = 'PC',
  MOBILE = 'MOBILE'
}

export interface BannerSpec {
  id: string;
  name: string;
  width: number;
  height: number;
  usage: string;
  fileName: string;
}

export const PC_SPECS: BannerSpec[] = [
  {
    id: 'pc_home',
    name: '首頁主橫幅',
    width: 3200,
    height: 1040,
    usage: '主要登陸頁英雄區塊',
    fileName: 'pc_home_3200x1040.png'
  },
  {
    id: 'pc_eventlist',
    name: '活動列表橫幅',
    width: 1160,
    height: 528,
    usage: '促銷列表背景圖',
    fileName: 'pc_eventlist_1160x528.png'
  },
  {
    id: 'pc_eventdetail',
    name: '活動詳情橫幅',
    width: 3840,
    height: 920,
    usage: '高解析度超寬活動頭部',
    fileName: 'pc_eventdetail_3840x920.png'
  },
  {
    id: 'pc_popup',
    name: '彈窗活動圖',
    width: 740,
    height: 556,
    usage: 'PC 活動彈窗 / 視窗廣告',
    fileName: 'pc_popup_740x556.png'
  }
];

export const MOBILE_SPECS: BannerSpec[] = [
  {
    id: 'mb_home',
    name: '首頁/促銷列表',
    width: 702,
    height: 320,
    usage: '行動版首頁主視覺',
    fileName: 'mb_home_702x320.png'
  },
  {
    id: 'mb_promo',
    name: '促銷活動橫幅',
    width: 560,
    height: 200,
    usage: '特定優惠迷你橫幅',
    fileName: 'mb_promo_560x200.png'
  },
  {
    id: 'mb_eventdetail',
    name: '活動詳情頭部',
    width: 750,
    height: 548,
    usage: '行動版活動詳情頁頁首',
    fileName: 'mb_eventdetail_750x548.png'
  },
  {
    id: 'mb_vip',
    name: 'VIP 會員橫幅',
    width: 540,
    height: 260,
    usage: '尊榮會員專屬促銷圖',
    fileName: 'mb_vip_540x260.png'
  },
  {
    id: 'mb_wallet',
    name: '充值提款橫幅',
    width: 290,
    height: 160,
    usage: '交易區塊功能引導圖',
    fileName: 'mb_wallet_290x160.png'
  },
  {
    id: 'mb_popup',
    name: '活動彈窗圖',
    width: 650,
    height: 782,
    usage: '行動版活動彈窗 / 視窗廣告',
    fileName: 'mb_popup_650x782.png'
  }
];
