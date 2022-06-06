export const luis = {
    name: 'Luis',
    age: 26,
    city: 'Lyon'
};

export function presentPerson(person) {
    return `Hello my name is ${person.name}, I'm ${person.age} yo and I live in ${person.city}!`;
}
