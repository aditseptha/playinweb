import type { SVGProps } from "react";
import {
  IconBookmark,
  IconCoin,
  IconDoc,
  IconDownload,
  IconFlag,
  IconGrid,
  IconHome,
  IconLineGraph,
  IconMegaphone,
  IconShield,
  IconUser,
  IconWallet,
  type IconProps,
} from "@/components/icons";

export type NavIconProps = SVGProps<SVGSVGElement> & { active?: boolean };

function nav(Icon: (props: IconProps) => React.JSX.Element) {
  return function NavGlyph({ active, ...props }: NavIconProps) {
    void active;
    return <Icon {...props} />;
  };
}

export const IconHomeNav = nav(IconHome);
export const IconUserNav = nav(IconUser);
export const IconGridNav = nav(IconGrid);
export const IconBookmarkNav = nav(IconBookmark);
export const IconWalletNav = nav(IconWallet);
export const IconCoinNav = nav(IconCoin);
export const IconLineGraphNav = nav(IconLineGraph);
export const IconMegaphoneNav = nav(IconMegaphone);
export const IconDownloadNav = nav(IconDownload);
export const IconFlagNav = nav(IconFlag);
export const IconShieldNav = nav(IconShield);
export const IconDocNav = nav(IconDoc);
