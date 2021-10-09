export default class NumberGenerator {
    public static randomInt(min: number, max: number): number {
        return Math.floor(min + Math.random() * (max - min));
    }

    public static randomFloat(min?: number, max?: number): number {
        if (min && max) {
            return min + Math.random() * (max - min);
        }
        return Math.random();
    }
}