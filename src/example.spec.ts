function addNumbers(num1: number, num2: number){
    return num1 + num2;
}
describe('Add to numbers', () => {
    it('adds two number', () => {
        expect(addNumbers(2,2)).toEqual(4);
    });
});

describe('Example test', () => {
    it('equals true', () => {
        expect(true).toEqual(true);
    });
});
