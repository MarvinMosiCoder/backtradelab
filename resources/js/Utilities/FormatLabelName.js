import CapitalizeFirstLetter from "./CapitalizeFirstLetter";

export default function FormatLabelName(label) {
    return label?.split(/[_\s]/).map(CapitalizeFirstLetter).join(' ');
}